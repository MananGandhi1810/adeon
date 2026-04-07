import os
import re
import json
import base64
import redis
import numpy as np
from pathlib import Path
import binascii
from typing import Optional

from flask import Flask, request, jsonify
from dotenv import load_dotenv

import requests
import google.generativeai as genai
from bs4 import BeautifulSoup
from urllib.parse import urljoin

# ─────────────────────────────────────────
# Load only GEMINI_API_KEY from .env
# ─────────────────────────────────────────
load_dotenv()  # expects .env in same directory as this script

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY must be set in .env")

# ─────────────────────────────────────────
# Redis client (default localhost:6379)
# ─────────────────────────────────────────
# Get Redis URL from environment or use default
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)
CACHE_TTL = 24 * 3600  # 24 hours in seconds
VECTOR_PREFIX = "semvec:"           # namespace for embeddings
# redis_client.flushdb() uncomment to clear Redis cache on every run

# ─────────────────────────────────────────
# LLM (Gemini) Setup
# ─────────────────────────────────────────
genai.configure(api_key=GEMINI_API_KEY)
LLM_MODEL = genai.GenerativeModel("gemini-3.1-flash-lite-preview")
EMBED_MODEL = "gemini-embedding-001"  # or "gemini-embedding-exp-03-07"
# ─────────────────────────────────────────

# Documentation sources mapping
DOCS_SOURCES = {
    "django":    "https://docs.djangoproject.com/en/stable/",
    "flask":     "https://flask.palletsprojects.com/en/latest/",
    "react":     "https://reactjs.org/docs/getting-started.html",
    "python":    "https://docs.python.org/3/",
    "javascript":"https://developer.mozilla.org/en-US/docs/Web/JavaScript",
    "java":      "https://docs.oracle.com/javase/8/docs/api/",
    "c++":       "https://en.cppreference.com/w/",
    "c#":        "https://docs.microsoft.com/en-us/dotnet/csharp/",
    "go":        "https://pkg.go.dev/",
    "ruby":      "https://ruby-doc.org/",
    "php":       "https://www.php.net/docs.php",
    "rust":      "https://doc.rust-lang.org/",
    "typescript":"https://www.typescriptlang.org/docs/",
    "html":      "https://developer.mozilla.org/en-US/docs/Web/HTML",
    "css":       "https://developer.mozilla.org/en-US/docs/Web/CSS",
}

# ─────────────────────────────────────────
# Supported file extensions → language
# ─────────────────────────────────────────
SUPPORTED_EXTENSIONS = {
    ".py": "python",
    ".js": "javascript",
    ".java": "java",
    ".ts": "typescript",
    ".cpp": "cpp",
    ".c": "c",
    ".cs": "csharp",
    ".rb": "ruby",
    ".go": "go",
    ".php": "php",
}


# ─────────────────────────────────────────
# Utility: Clean triple‐backtick fences
# ─────────────────────────────────────────
def clean_code_block(s: str) -> str:
    if not isinstance(s, str):
        return ""
    s = re.sub(r"^```[\w]*\n", "", s.strip(), flags=re.MULTILINE)
    s = re.sub(r"```$", "", s.strip(), flags=re.MULTILINE)
    return s.strip()

def _as_str(val) -> str:
    """Return `val` as a normal str whether it is bytes or already str."""
    return val.decode() if isinstance(val, (bytes, bytearray)) else val


def _extract_json_array(text: str):
    """
    Try to parse and return the first valid JSON array found in `text`.
    Returns [] when no valid array can be parsed.
    """
    if not text:
        return []

    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)

    # Fast path: entire payload is a JSON array.
    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, list):
            return parsed
    except json.JSONDecodeError:
        pass

    # Fallback: find the first decodable array inside mixed text.
    decoder = json.JSONDecoder()
    for idx, ch in enumerate(cleaned):
        if ch != "[":
            continue
        try:
            candidate, _ = decoder.raw_decode(cleaned[idx:])
            if isinstance(candidate, list):
                return candidate
        except json.JSONDecodeError:
            continue
    return []


# ─────────────────────────────────────────
# Gemini call helper
# ─────────────────────────────────────────
def call_gemini(prompt: str, expect_json: bool = False):
    try:
        resp = LLM_MODEL.generate_content(prompt)
        text = (resp.text or "").strip()
        if expect_json:
            return _extract_json_array(text)
        return text
    except Exception as e:
        print(f"LLM error: {e}")
        return [] if expect_json else ""

def embed_text(text: str) -> np.ndarray:
    """
    Returns a float32 numpy vector for `text`.
    """
    if not text:
        return np.zeros(768, dtype=np.float32)  # or whatever dim you expect

    resp = genai.embed_content(
        model="models/embedding-001",
        content=text,
        task_type="retrieval_query",
    )
    return np.asarray(resp["embedding"], dtype=np.float32)


def store_vector(key: str, vector: np.ndarray, meta: dict):
    """
    Persist a vector and its metadata into Redis.
    """
    # raw bytes for the vector
    redis_client.set(f"{VECTOR_PREFIX}data:{key}", vector.tobytes())
    # JSON‐encoded metadata
    redis_client.hset(
        f"{VECTOR_PREFIX}meta:{key}",
        mapping={k: json.dumps(v) for k, v in meta.items()}
    )

def load_vector(path: str) -> Optional[np.ndarray]:
    """
    Fetch a Base-64 encoded vector from Redis and return it as a NumPy array.
    Returns None if the key does not exist or is corrupt.
    """
    raw = redis_client.get(f"{VECTOR_PREFIX}data:{path}")
    if raw is None:
        return None

    # redis-py returns str when decode_responses=True
    if isinstance(raw, str):
        raw = raw.encode()

    # Base-64 decode; guard against corrupt entries
    try:
        raw = base64.b64decode(raw)
    except binascii.Error:
        return None

    return np.frombuffer(raw, dtype=np.float32)

def load_meta(key: str) -> dict:
    raw = redis_client.hgetall(f"{VECTOR_PREFIX}meta:{key}")
    return {k.decode().split("meta:")[1]: json.loads(v) for k, v in raw.items()}

def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    return float(a.dot(b) / (np.linalg.norm(a) * np.linalg.norm(b)))


# ─────────────────────────────────────────
# GitHub API helper functions
# ─────────────────────────────────────────
# def github_headers(raw_token):
    # Accept either a string or a dict-like payload
    if isinstance(raw_token, dict):
        # most common keys people stuff the token under
        for key in ("token", "Authorization", "authorization"):
            if key in raw_token:
                raw_token = raw_token[key]
                break
        else:
            raise ValueError("Unable to extract token from dict payload")

    if not isinstance(raw_token, str):
        raise TypeError(f"token must be str, got {type(raw_token).__name__}")

    # normalise: strip \r, \n and any leading scheme
    token = raw_token.replace("\r", "").strip()
    for prefix in ("token ", "bearer ", "Bearer "):
        if token.lower().startswith(prefix):
            token = token[len(prefix):]
            

    scheme = "Bearer" if token.startswith("github_pat_") else "token"

    return {
        "Accept": "application/vnd.github.v3+json",
        "Authorization": f"{scheme} {token}",

    }
def github_headers(raw_token: str) -> dict:
    """
    Build the header GitHub expects.

    Accepts either a bare PAT or a string that already starts with
    ``token …`` or ``Bearer …``. Works for classic PATs (ghp_/gho_)
    and fine-grained tokens (github_pat_…).
    """
    if isinstance(raw_token, dict):
        raise TypeError("Expected a string, not a dict, for GitHub token")

    # Strip stray CR/LF and any surrounding whitespace
    token = raw_token.replace("\r", "").strip()

    # Remove a scheme that the caller may have added
    for prefix in ("token ", "bearer ", "Bearer "):
        if token.lower().startswith(prefix):
            token = token[len(prefix):]
            break

    # Choose scheme: classic PAT → "token", fine-grained → "Bearer"
    scheme = "Bearer" if token.startswith("github_pat_") else "token"

    return {
        "Accept": "application/vnd.github.v3+json",
        "Authorization": f"{scheme} {token}",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def get_default_branch(owner: str, repo: str, headers: dict) -> str:
    url = f"https://api.github.com/repos/{owner}/{repo}"
    resp = requests.get(url, headers=headers)
    resp.raise_for_status()
    return resp.json()["default_branch"]


def get_commit_sha_for_branch(owner: str, repo: str, branch: str, headers: dict) -> str:
    url_ref = f"https://api.github.com/repos/{owner}/{repo}/git/refs/heads/{branch}"
    resp = requests.get(url_ref, headers=headers)
    resp.raise_for_status()
    return resp.json()["object"]["sha"]


def get_tree_sha_for_branch(owner: str, repo: str, branch: str, headers: dict) -> str:
    commit_sha = get_commit_sha_for_branch(owner, repo, branch, headers)
    url_commit = f"https://api.github.com/repos/{owner}/{repo}/git/commits/{commit_sha}"
    resp = requests.get(url_commit, headers=headers)
    resp.raise_for_status()
    return resp.json()["tree"]["sha"]


def get_github_tree(owner: str, repo: str, tree_sha: str, headers: dict):
    url = (
        f"https://api.github.com/repos/{owner}/{repo}/git/trees/{tree_sha}?recursive=1"
    )
    resp = requests.get(url, headers=headers)
    resp.raise_for_status()
    return resp.json().get("tree", [])


def fetch_file_content(
    owner: str, repo: str, path: str, branch: str, headers: dict
) -> str:
    cache_key = f"{owner}:{repo}:{branch}:{path}:file_contents"
    cached = redis_client.get(cache_key)
    if cached is not None:
        return cached
    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"
    resp = requests.get(url, headers=headers, params={"ref": branch})
    resp.raise_for_status()
    data = resp.json()
    if data.get("encoding") != "base64" or "content" not in data:
        return ""
    result = base64.b64decode(data["content"]).decode("utf-8", errors="ignore")
    redis_client.setex(cache_key, CACHE_TTL, result)
    return result

def get_repo_license(owner: str, repo: str, headers: dict):
    """
    Try common LICENSE filenames first; otherwise fall back to GitHub's repo license field.
    Returns either:
      {"file": "<LICENSE filename>", "content": "<first 10 lines>"} 
    or
      {"spdx_id": "...", "name": "..."}
    """
    branch = get_default_branch(owner, repo, headers)
    for name in ("LICENSE", "LICENSE.md", "LICENSE.txt"):
        try:
            content = fetch_file_content(owner, repo, name, branch, headers)
            snippet = "\n".join(content.splitlines()[:10])
            return {"file": name, "content": snippet}
        except requests.HTTPError:
            continue

    # Fallback to API
    url = f"https://api.github.com/repos/{owner}/{repo}"
    resp = requests.get(url, headers=headers, timeout=10)
    resp.raise_for_status()
    lic = resp.json().get("license", {}) or {}

    return {"spdx_id": lic.get("spdx_id"), "name": lic.get("name")}


def get_file_license_header(owner: str, repo: str, path: str, branch: str, headers: dict):
    """
    Grabs the first 10 lines of `path` and looks for SPDX-License-Identifier or Copyright.
    Returns the matching line or None.
    """
    content = fetch_file_content(owner, repo, path, branch, headers)
    for line in content.splitlines()[:10]:
        if "SPDX-License-Identifier:" in line:
            return line.strip()
        m = re.search(r"(Copyright\s.*)", line)
        if m:
            return m.group(1).strip()
    return None


def get_repo_contributors(owner: str, repo: str, headers: dict):
    """
    Uses GitHub's Contributors API to pull up to 100 contributors
    (login + commit count).
    """
    url = f"https://api.github.com/repos/{owner}/{repo}/contributors?per_page=100"
    resp = requests.get(url, headers=headers, timeout=10)
    resp.raise_for_status()
    return [
        {"login": u["login"], "contributions": u["contributions"]}
        for u in resp.json()
    ]


# ─────────────────────────────────────────
# AI Prompt Templates
# ─────────────────────────────────────────
def prompt_test_cases(code: str, language: str) -> str:
    return f"""
Given the following {language} code, generate comprehensive unit/integration test code using the standard test framework for that language.
Return ONLY the test code as plain text, WITHOUT explanations, comments, or markdown fences.
Format output to be copy-paste ready with correct indentation and line breaks.

Code:
{code}
"""


def prompt_generate_mocks(code: str, language: str) -> str:
    return f"""
Given the following {language} code (functions/classes/modules), generate:
- Realistic test input data for each function/class (both valid and invalid edge cases)
- Example mocks for any APIs, DB calls, or external services used (use unittest.mock, pytest, or language-native mocking tools)
Output ONLY the code, one test function per example (named test_*), ready to copy-paste. No explanations.

Code:
{code}
"""


def prompt_bug_finder(code: str, language: str) -> str:
    return f"""
You are a senior security engineer.
Review the following {language} code for:
- Logic bugs
- Security vulnerabilities (injection, XSS, CSRF, unsafe deserialization, etc.)
- Bad practices or anti-patterns

For each issue, output:
- Line number(s)
- Short description
- Severity (High/Medium/Low)
- A concise suggested fix

Output ONLY as a JSON array:
[
  {{"line": 12, "issue": "Possible SQL Injection", "severity": "High", "fix": "Use parameterized queries"}},
  ...
]

Code:
{code}
"""


# ─────────────────────────────────────────
# Core Generation Functions
# ─────────────────────────────────────────
def list_all_files(owner: str, repo: str, token: str, single_file: str = None):
    headers = github_headers(token)
    branch = get_default_branch(owner, repo, headers)
    tree_sha = get_tree_sha_for_branch(owner, repo, branch, headers)
    tree = get_github_tree(owner, repo, tree_sha, headers)

    cache_key = get_cache_key(owner, repo, tree_sha, "file_tree")
    cached = redis_client.get(cache_key)
    if cached is not None:
        return json.loads(cached)

    files = []
    for element in tree:
        if element["type"] != "blob":
            continue
        path = element["path"]
        ext = Path(path).suffix
        if ext in SUPPORTED_EXTENSIONS:
            files.append((path, SUPPORTED_EXTENSIONS[ext]))
    if single_file:
        for p, lang in files:
            if p == single_file:
                return [(p, lang)]
        return []
    
    redis_client.setex(cache_key, CACHE_TTL, json.dumps(files))
    return files


def generate_tests(owner: str, repo: str, token: str, single_file: str = None):
    headers = github_headers(token)
    branch = get_default_branch(owner, repo, headers)
    files = list_all_files(owner, repo, token, single_file)

    results = {}
    for rel_path, language in files:
        code = fetch_file_content(owner, repo, rel_path, branch, headers)
        prompt = prompt_test_cases(code, language)
        raw = call_gemini(prompt)
        tests = clean_code_block(raw)
        results[rel_path] = {"language": language, "test_cases": tests}
    return results


def generate_mocks(owner: str, repo: str, token: str, single_file: str = None):
    headers = github_headers(token)
    branch = get_default_branch(owner, repo, headers)
    files = list_all_files(owner, repo, token, single_file)

    results = {}
    for rel_path, language in files:
        code = fetch_file_content(owner, repo, rel_path, branch, headers)
        prompt = prompt_generate_mocks(code, language)
        raw = call_gemini(prompt)
        mocks = clean_code_block(raw)
        results[rel_path] = {"language": language, "mock_data": mocks}
    return results


def detect_bugs(owner: str, repo: str, token: str, single_file: str = None):
    headers = github_headers(token)
    branch = get_default_branch(owner, repo, headers)
    files = list_all_files(owner, repo, token, single_file)

    results = {}
    for rel_path, language in files:
        code = fetch_file_content(owner, repo, rel_path, branch, headers)
        prompt = prompt_bug_finder(code, language)
        bugs = call_gemini(prompt, expect_json=True)
        results[rel_path] = {"language": language, "bug_report": bugs}
    return results

def fetch_latest_docs(name: str):
    url = DOCS_SOURCES.get(name) or f"https://{name}.readthedocs.io/en/latest/"
    resp = requests.get(url, timeout=10)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")
    main = soup.find("main") or soup
    items = []
    for tag in main.find_all(["h1","h2","h3","p"], limit=50):
        text = tag.get_text(strip=True)
        if text:
            items.append({"tag": tag.name, "text": text})
    links = []
    nav_container = soup.find("nav") or soup.find("aside")
    if nav_container:
        for a in nav_container.find_all("a", href=True, limit=20):
            txt, href = a.get_text(strip=True), a["href"]
            if txt and href:
                full = urljoin(url, href)
                links.append({"text": txt, "href": full})
            if len(links) >= 10:
                break
    return {"url": url, "content": items, "links": links}

def get_repo_languages(owner: str, repo: str, headers: dict):
    url = f"https://api.github.com/repos/{owner}/{repo}/languages"
    resp = requests.get(url, headers=headers, timeout=10)
    resp.raise_for_status()
    return list(resp.json().keys())


# ─────────────────────────────────────────
# Cache‐Key Utility
# ─────────────────────────────────────────
def get_cache_key(
    owner: str, repo: str, commit_sha: str, feature: str, single_file: str = None
) -> str:
    base_key = f"{owner}:{repo}:{commit_sha}:{feature}"
    if single_file:
        sanitized = single_file.replace(":", "_")
        return f"{base_key}:{sanitized}"
    return base_key


# ─────────────────────────────────────────
# Stack Overflow Integration
# ─────────────────────────────────────────
def fetch_stackoverflow_for_issue(issue_text: str, max_hits: int = 3):
    """
    Given an issue text, query Stack Overflow for top relevant questions (with accepted answers).
    Returns a list of up to `max_hits` hits:
    [
      {
        "question_id": ...,
        "title": "...",
        "link": "...",
        "accepted_answer": {
          "answer_id": ...,
          "body": "..."
        }
      },
      ...
    ]
    """
    try:
        search_url = "https://api.stackexchange.com/2.3/search/advanced"
        params = {
            "order": "desc",
            "sort": "relevance",
            "accepted": "True",
            "title": issue_text,
            "site": "stackoverflow",
            "pagesize": max_hits,
        }
        resp = requests.get(search_url, params=params)
        resp.raise_for_status()
        questions = resp.json().get("items", [])
        hits = []
        for q in questions:
            qid = q["question_id"]
            title = q["title"]
            link = q["link"]

            # Fetch top answer for this question
            ans_url = f"https://api.stackexchange.com/2.3/questions/{qid}/answers"
            ans_params = {
                "order": "desc",
                "sort": "votes",
                "site": "stackoverflow",
                "filter": "withbody",
                "pagesize": 1,
            }
            ans_resp = requests.get(ans_url, params=ans_params)
            ans_resp.raise_for_status()
            answers = ans_resp.json().get("items", [])
            accepted = None
            if answers:
                accepted = {
                    "answer_id": answers[0]["answer_id"],
                    "body": answers[0]["body"],
                    "is_accepted": answers[0].get("is_accepted", False),
                }
            hits.append(
                {
                    "question_id": qid,
                    "title": title,
                    "link": link,
                    "accepted_answer": accepted,
                }
            )
        return hits
    except Exception as e:
        print(f"[StackOverflow API error] {e}")
        return []


# ─────────────────────────────────────────
# Request Validation Utility
# ─────────────────────────────────────────
def validate_request_json(data):
    owner = data.get("owner")
    repo = data.get("repo")
    token = data.get("token")
    if not owner or not repo or not token:
        raise ValueError("Request JSON must include 'owner', 'repo', and 'token'.")
    return owner, repo, token


# ─────────────────────────────────────────
# Flask App + Endpoints
# ─────────────────────────────────────────
app = Flask(__name__)


@app.route("/generate_tests", methods=["POST"])
def endpoint_generate_tests():
    try:
        body = request.get_json(force=True)
        owner, repo, token = validate_request_json(body)
        single_file = body.get("file")

        headers = github_headers(token)
        default_branch = get_default_branch(owner, repo, headers)
        commit_sha = get_commit_sha_for_branch(owner, repo, default_branch, headers)

        cache_key = get_cache_key(
            owner, repo, commit_sha, "generate_tests", single_file
        )
        cached = redis_client.get(cache_key)
        if cached is not None:
            redis_client.expire(cache_key, CACHE_TTL)
            return jsonify(json.loads(cached))

        result = generate_tests(owner, repo, token, single_file)
        redis_client.setex(cache_key, CACHE_TTL, json.dumps(result))
        return jsonify(result)

    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        print(f"[ERROR] generate_tests: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/generate_mocks", methods=["POST"])
def endpoint_generate_mocks():
    try:
        body = request.get_json(force=True)
        owner, repo, token = validate_request_json(body)
        single_file = body.get("file")

        headers = github_headers(token)
        default_branch = get_default_branch(owner, repo, headers)
        commit_sha = get_commit_sha_for_branch(owner, repo, default_branch, headers)

        cache_key = get_cache_key(
            owner, repo, commit_sha, "generate_mocks", single_file
        )
        cached = redis_client.get(cache_key)
        if cached is not None:
            redis_client.expire(cache_key, CACHE_TTL)
            return jsonify(json.loads(cached))

        result = generate_mocks(owner, repo, token, single_file)
        redis_client.setex(cache_key, CACHE_TTL, json.dumps(result))
        return jsonify(result)

    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        print(f"[ERROR] generate_mocks: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/bug_detect", methods=["POST"])
def endpoint_bug_detect():
    try:
        body = request.get_json(force=True)
        owner, repo, token = validate_request_json(body)
        single_file = body.get("file")

        headers = github_headers(token)
        default_branch = get_default_branch(owner, repo, headers)
        commit_sha = get_commit_sha_for_branch(owner, repo, default_branch, headers)

        cache_key = get_cache_key(owner, repo, commit_sha, "bug_detect", single_file)
        cached = redis_client.get(cache_key)
        if cached is not None:
            cached_payload = json.loads(cached)

            # If old cache is all-empty, recompute instead of pinning bad data for 24h.
            has_any_bug = any(
                isinstance(file_data, dict) and file_data.get("bug_report")
                for file_data in cached_payload.values()
            )
            if has_any_bug:
                redis_client.expire(cache_key, CACHE_TTL)
                return jsonify(cached_payload)

            redis_client.delete(cache_key)

        # Step 1: Run raw bug detection via Gemini
        raw_result = detect_bugs(owner, repo, token, single_file)

        # Step 2: Enrich each bug with StackOverflow hits
        for rel_path, data in raw_result.items():
            enriched = []
            for issue_entry in data["bug_report"]:
                issue_text = issue_entry.get("issue", "")
                so_hits = fetch_stackoverflow_for_issue(issue_text, max_hits=3)
                issue_entry["stackoverflow_hits"] = so_hits
                enriched.append(issue_entry)
            raw_result[rel_path]["bug_report"] = enriched

        # Step 3: Cache enriched result
        redis_client.setex(cache_key, CACHE_TTL, json.dumps(raw_result))
        return jsonify(raw_result)

    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        print(f"[ERROR] bug_detect: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/chat", methods=["POST"])
def endpoint_chat():
    """
    Chat with code feature:
    Expects JSON: {
      "owner": "...",
      "repo": "...",
      "token": "...",
      "messages": [ {"role":"system"/"user"/"assistant","content":"..."} , ... ]
    }
    Returns: { "reply": "<LLM response>" }
    """
    try:
        body = request.get_json(force=True)
        owner, repo, token = validate_request_json(body)
        messages = body.get("messages")
        if not messages or not isinstance(messages, list):
            raise ValueError("Request JSON must include a 'messages' array.")

        # Fetch and concatenate codebase (up to ~200k characters)
        code_blob = fetch_full_code(owner, repo, token)

        # Build a single prompt: system + code context + conversation
        system_prompt = (
            "You are a helpful AI assistant specialized in analyzing code. "
            "Below is the codebase. Use it to answer the user’s questions. "
            "If you need to reference a file or snippet, quote the relevant lines."
            "\n\nCodebase:\n" + code_blob + "\n\n"
        )

        # Append system prompt as first message
        prompt_parts = [{"role": "system", "content": system_prompt}]
        # Then add user/assistant conversation
        for msg in messages:
            role = msg.get("role")
            content = msg.get("content")
            if role not in ("system", "user", "assistant") or not isinstance(
                content, str
            ):
                continue
            prompt_parts.append({"role": role, "content": content})

        # Flatten prompts into a single text prompt for Gemini
        chat_prompt = ""
        for part in prompt_parts:
            prefix = (
                "[System]:"
                if part["role"] == "system"
                else ("[User]:" if part["role"] == "user" else "[Assistant]:")
            )
            chat_prompt += f"{prefix} {part['content']}\n"
        chat_prompt += "[Assistant]:"

        # Call Gemini to generate chat response
        reply = call_gemini(chat_prompt)

        return jsonify({"reply": reply})

    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        print(f"[ERROR] chat: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/mcp_repo", methods=["POST"])
def mcp_repo():
    data = request.get_json(force=True)
    owner = data.get("owner", "").strip()
    repo = data.get("repo", "").strip()
    token = data.get("token", "").strip()
    if not (owner and repo and token):
        return jsonify({"error": "Missing 'owner', 'repo', or 'token'"}), 400
    headers = github_headers(token)
    branch = get_default_branch(owner, repo, headers)
    commit_sha = get_commit_sha_for_branch(owner, repo, branch, headers)
    cache_key = f"{owner}/{repo}/{commit_sha}/mcp_repo_docs"
    if (cached := redis_client.get(cache_key)):
        result = json.loads(cached)
        redis_client.expire(cache_key, CACHE_TTL)
        return jsonify(result)
    try:
        langs = get_repo_languages(owner, repo, headers)
        docs = {}
        for lang in langs:
            key = lang.lower()
            docs[lang] = fetch_latest_docs(key)
        result = {"owner": owner, "repo": repo, "languages": docs}
        redis_client.setex(cache_key, CACHE_TTL, json.dumps(result))
        return jsonify(result)
    except requests.HTTPError as e:
        return jsonify({"error": f"GitHub/docs fetch failed: {e}"}), 502
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# @app.route("/index_embeddings", methods=["POST"])
# def index_embeddings():
#     """
#     Walk the repo, embed each file’s content with Gemini, and store in Redis.
#     POST  { owner, repo, token }
#     """
#     data  = request.get_json(force=True)
#     owner = data.get("owner", "").strip()
#     repo  = data.get("repo",  "").strip()
#     token = data.get("token", "").strip()
#     if not (owner and repo and token):
#         return jsonify({"error": "Missing 'owner', 'repo', or 'token'"}), 400

#     # 1) Build GitHub auth headers once
#     headers = github_headers(token)

#     # 2) Resolve default branch
#     try:
#         branch = get_default_branch(owner, repo, headers)
#     except Exception as e:
#         app.logger.error(f"Failed to get default branch: {e}")
#         return jsonify({"error": str(e)}), 500

#     # 3) Get list of code files in the repo
#     try:
#         files = [p for p, _ in list_all_files(owner, repo, token)]
#     except Exception as e:
#         app.logger.error(f"Failed to list files: {e}")
#         return jsonify({"error": str(e)}), 500

#     indexed = 0
#     # 4) Embed & store each file
#     for path in files:
#         try:
#             content = fetch_file_content(owner, repo, path, branch, headers)
#             if not content:                 # skip empty files
#                 continue

#             # Gemini embedding call  (SDK v0.3+)
#             resp = genai.embed_content(
#                 model="models/embedding-001",
#                 content=content,
#                 task_type="retrieval_document",
#             )
#             vec = np.asarray(resp["embedding"], dtype=np.float32)

#             # store vector & quick-view snippet in Redis
#             redis_client.set(
#                 f"semvec:data:{path}",
#                 base64.b64encode(vec.tobytes()).decode("ascii"),
#             )
#             redis_client.hset(
#                 f"semvec:meta:{path}",
#                 mapping={"path": path, "snippet": content[:200]},
#             )
#             indexed += 1

#         except Exception as e:
#             app.logger.error(f"Error indexing {path}: {e}")

#     return jsonify(
#         {
#             "status":        "indexed",
#             "files_indexed": indexed,
#             "total_files":   len(files),
#         }
#     )


def _as_str(val) -> str:
    """Return `val` as a normal str whether it is bytes or already str."""
    return val.decode() if isinstance(val, (bytes, bytearray)) else val


# @app.route("/semantic_search", methods=["POST"])
# def semantic_search():
    """
    POST { query: str, top_n: int (optional) }
    Returns the top-N code snippets most semantically similar to `query`.
    """
    data  = request.get_json(force=True)
    query = data.get("query", "").strip()
    top_n = int(data.get("top_n", 5))
    if not query:
        return jsonify({"error": "Missing 'query'"}), 400

    # 1) Embed the user’s query
    try:
        q_vec = embed_text(query)
    except Exception as e:
        app.logger.error(f"Embedding failed: {e}")
        return jsonify({"error": str(e)}), 502

    # 2) Compare against all stored vectors
    results = []
    for raw_key in redis_client.keys(f"{VECTOR_PREFIX}data:*"):
        key_str = raw_key if isinstance(raw_key, str) else raw_key.decode()
        path    = key_str.split("data:", 1)[1]


        vec = load_vector(path)
        if vec is None:
            continue                                # skip missing / corrupt

        score = cosine_similarity(q_vec, vec)
        meta  = load_meta(path)
        results.append(
            {"path": meta["path"], "snippet": meta["snippet"], "score": score}
        )

    # 3) Return the top-N matches
    results.sort(key=lambda x: x["score"], reverse=True)
    return jsonify(results[:top_n])


@app.route("/license_scan", methods=["POST"])
def license_scan():
    """
    POST { owner, repo, token }
    Returns:
      {
        repo_license: {...},
        contributors: [...],
        files: {
          "path/to/file.py": {
             detected_license: "<SPDX or copyright>",
             license_header: "<the full header text>",
             authors: ["alice", "bob", ...]
          },
          ...
        }
      }
    """
    data = request.get_json(force=True)
    owner, repo, token = data.get("owner",""), data.get("repo",""), data.get("token","")
    if not (owner and repo and token):
        return jsonify({"error": "Missing 'owner', 'repo', or 'token'"}), 400

    headers    = github_headers(token)
    branch     = get_default_branch(owner, repo, headers)
    commit_sha = get_commit_sha_for_branch(owner, repo, branch, headers)
    cache_key  = f"{owner}/{repo}/{commit_sha}/license_scan"

    # Try cache
    if (cached := redis_client.get(cache_key)):
        result = json.loads(cached)
        redis_client.expire(cache_key, CACHE_TTL)
        return jsonify(result)

    try:
        # 1) Repo-level license
        repo_license = get_repo_license(owner, repo, headers)

        # 2) Contributors list
        contributors = get_repo_contributors(owner, repo, headers)
        contributor_logins = [c["login"] for c in contributors]

        # 3) Per-file headers
        files = [p for p, _ in list_all_files(owner, repo, token)]
        files_info = {}
        for f in files:
            header = get_file_license_header(owner, repo, f, branch, headers)
            files_info[f] = {
                "detected_license": header is not None,
                "license_header": header,
                "authors": contributor_logins
            }

        result = {
            "repo_license": repo_license,
            "contributors": contributors,
            "files": files_info
        }

        # Cache & return
        redis_client.setex(cache_key, CACHE_TTL, json.dumps(result))
        return jsonify(result)

    except requests.HTTPError as e:
        return jsonify({"error": f"GitHub/API error: {e}"}), 502
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────
# Helper: Fetch Full Codebase for Chat
# ─────────────────────────────────────────
def fetch_full_code(owner: str, repo: str, token: str, max_length: int = 300000) -> str:
    """
    Fetch and concatenate code files (up to max_length characters) into one text blob.
    Each file is prefixed with "#### File: <path>\n<content>\n".
    """
    headers = github_headers(token)
    default_branch = get_default_branch(owner, repo, headers)
    commit_sha = get_commit_sha_for_branch(owner, repo, default_branch, headers)

    cache_key = get_cache_key(owner, repo, commit_sha, "fetch_full_code")
    cached = redis_client.get(cache_key)
    if cached is not None:
        redis_client.expire(cache_key, CACHE_TTL)
        return cached

    tree_sha = get_tree_sha_for_branch(owner, repo, default_branch, headers)
    tree = get_github_tree(owner, repo, tree_sha, headers)

    code_parts = []
    total_len = 0

    for element in tree:
        if element["type"] != "blob":
            continue
        path = element["path"]
        ext = Path(path).suffix
        if ext not in SUPPORTED_EXTENSIONS:
            continue
        content = fetch_file_content(owner, repo, path, default_branch, headers)
        header = f"#### File: {path}\n"
        snippet = header + content + "\n\n"
        if total_len + len(snippet) > max_length:
            break
        code_parts.append(snippet)
        total_len += len(snippet)

    full_code = "".join(code_parts)
    redis_client.setex(cache_key, CACHE_TTL, full_code)
    return full_code


if __name__ == "__main__":
    app.run(port=8888)
