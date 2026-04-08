import { GoogleGenAI } from "@google/genai";
import axios from "axios";
import { getRepoContents } from "./processing.js"; // Wait, I need to export getRepoContents from processing.js

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SUPPORTED_EXTENSIONS = {
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
};

const cleanCodeBlock = (s) => {
  if (typeof s !== "string") return "";
  let cleaned = s.replace(/^```[\w]*\n/m, "").trim();
  cleaned = cleaned.replace(/```$/m, "").trim();
  return cleaned;
};

const extractJsonArray = (text) => {
  if (!text) return [];
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {
    // Basic fallback matching Python's 'search for [ decodable]'
    const match = cleaned.match(/\[.*\]/s);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed)) return parsed;
      } catch (err) { }
    }
  }
  return [];
};

const callGemini = async (prompt, expectJson = false) => {
  try {
    const resp = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: prompt,
    });
    const text = (resp.text || "").trim();
    if (expectJson) return extractJsonArray(text);
    return text;
  } catch (e) {
    console.error("LLM Error:", e);
    return expectJson ? [] : "";
  }
};

const fetchStackOverflowForIssue = async (issueText, maxHits = 3) => {
  try {
    const resp = await axios.get("https://api.stackexchange.com/2.3/search/advanced", {
      params: {
        order: "desc",
        sort: "relevance",
        accepted: "True",
        title: issueText,
        site: "stackoverflow",
        pagesize: maxHits,
      },
    });
    const questions = resp.data.items || [];
    const hits = [];
    for (const q of questions) {
      let accepted = null;
      try {
        const ansResp = await axios.get(`https://api.stackexchange.com/2.3/questions/${q.question_id}/answers`, {
          params: { order: "desc", sort: "votes", site: "stackoverflow", filter: "withbody", pagesize: 1 },
        });
        const answers = ansResp.data.items || [];
        if (answers.length > 0) {
          accepted = {
            answer_id: answers[0].answer_id,
            body: answers[0].body,
            is_accepted: answers[0].is_accepted || false,
          };
        }
      } catch (e) {
        console.error("StackOverflow answers API error:", e.response?.data || e.message);
      }
      hits.push({
        question_id: q.question_id,
        title: q.title,
        link: q.link,
        accepted_answer: accepted,
      });
    }
    return hits;
  } catch (e) {
    console.error("StackOverflow API error:", e.response?.data || e.message);
    return [];
  }
};

export const generateTestsLogic = async (allFileContents) => {
  const results = {};
  for (const file of allFileContents) {
    const ext = file.name.substring(file.name.lastIndexOf("."));
    if (!SUPPORTED_EXTENSIONS[ext]) continue;
    const language = SUPPORTED_EXTENSIONS[ext];
    const prompt = `Given the following ${language} code, generate comprehensive unit/integration test code using the standard test framework for that language.
Return ONLY the test code as plain text, WITHOUT explanations, comments, or markdown fences.
Format output to be copy-paste ready with correct indentation and line breaks.

Code:
${file.content}`;
    const raw = await callGemini(prompt);
    results[file.name] = { language, test_cases: cleanCodeBlock(raw) };
  }
  return results;
};

export const generateMocksLogic = async (allFileContents) => {
  const results = {};
  for (const file of allFileContents) {
    const ext = file.name.substring(file.name.lastIndexOf("."));
    if (!SUPPORTED_EXTENSIONS[ext]) continue;
    const language = SUPPORTED_EXTENSIONS[ext];
    const prompt = `Given the following ${language} code (functions/classes/modules), generate:
- Realistic test input data for each function/class (both valid and invalid edge cases)
- Example mocks for any APIs, DB calls, or external services used (use unittest.mock, pytest, or language-native mocking tools)
Output ONLY the code, one test function per example (named test_*), ready to copy-paste. No explanations.

Code:
${file.content}`;
    const raw = await callGemini(prompt);
    results[file.name] = { language, mock_data: cleanCodeBlock(raw) };
  }
  return results;
};

export const generateBugDetectLogic = async (allFileContents) => {
  const results = {};
  for (const file of allFileContents) {
    const ext = file.name.substring(file.name.lastIndexOf("."));
    if (!SUPPORTED_EXTENSIONS[ext]) continue;
    const language = SUPPORTED_EXTENSIONS[ext];
    const prompt = `You are a senior security engineer.
Review the following ${language} code for:
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
  {"line": 12, "issue": "Possible SQL Injection", "severity": "High", "fix": "Use parameterized queries"},
  ...
]

Code:
${file.content}`;
    const bugs = await callGemini(prompt, true);
    // Enriched with SO
    const enriched = [];
    for (const issueEntry of bugs) {
      if (issueEntry.issue) {
        issueEntry.stackoverflow_hits = await fetchStackOverflowForIssue(issueEntry.issue, 3);
      }
      enriched.push(issueEntry);
    }
    results[file.name] = { language, bug_report: enriched };
  }
  return results;
};

export const chatWithRepoLogic = async (allFileContents, messages) => {
  let codeBlob = "";
  let totalLen = 0;
  for (const file of allFileContents) {
    const ext = file.name.substring(file.name.lastIndexOf("."));
    if (!SUPPORTED_EXTENSIONS[ext]) continue;
    const header = `#### File: ${file.name}\n`;
    const snippet = header + file.content + "\n\n";
    if (totalLen + snippet.length > 300000) break;
    codeBlob += snippet;
    totalLen += snippet.length;
  }
  const systemPrompt = `You are a helpful AI assistant specialized in analyzing code. Below is the codebase. Use it to answer the user’s questions. If you need to reference a file or snippet, quote the relevant lines.\n\nCodebase:\n${codeBlob}\n\n`;

  const promptParts = [{ role: "system", content: systemPrompt }];
  for (const msg of messages) {
    if (["system", "user", "assistant"].includes(msg.role) && typeof msg.content === "string") {
      promptParts.push({ role: msg.role, content: msg.content });
    }
  }

  let chatPrompt = "";
  for (const part of promptParts) {
    const prefix = part.role === "system" ? "[System]:" : part.role === "user" ? "[User]:" : "[Assistant]:";
    chatPrompt += `${prefix} ${part.content}\n`;
  }
  chatPrompt += "[Assistant]:";

  const reply = await callGemini(chatPrompt);
  return { reply };
};

import { set, get, exists } from "./keyvalue-db.js";

export const normalizeMermaidDiagram = (rawDiagram) => {
  if (!rawDiagram || typeof rawDiagram !== "string") {
    return "graph TD";
  }

  let diagram = rawDiagram
    .replace(/```mermaid\s*/gi, "")
    .replace(/```/g, "")
    .trim();

  if (!diagram) {
    return "graph TD";
  }

  if (/^(graph|flowchart)\s+(TB|TD|BT|RL|LR)\b/i.test(diagram)) {
    return diagram;
  }

  const directionMatch = diagram.match(/^(TB|TD|BT|RL|LR)\b/i);
  if (directionMatch) {
    const direction = directionMatch[1].toUpperCase();
    diagram = diagram.replace(/^(TB|TD|BT|RL|LR)\b\s*/i, "").trimStart();
    return `graph ${direction}${diagram ? `\n${diagram}` : ""}`;
  }

  return `graph TD\n${diagram}`;
};

export const generateReadme = async (owner, repo, ref, fileContents) => {
  const redisKey = `readme:${owner}:${repo}:${ref}`;
  const expiry = 24 * 60 * 60;

  if (await exists(redisKey)) {
    console.log(`[CACHE] Getting README for ${owner}/${repo}/${ref}`);
    return await get(redisKey);
  }

  const repoText = fileContents
    .map((file) => `File: ${file.name}\nContent:\n${file.content}\n\n`)
    .join("");

  console.log(repoText.length);

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: `Create a comprehensive, professional README.md file for the following project:

Project files and content are provided below. Analyze the codebase to understand:
- The project's purpose and functionality
- Main components and their interactions
- Technologies and dependencies used
- API endpoints (if applicable)

Structure the README with these sections:
1. Title and brief description
2. Installation instructions
3. Usage examples with code snippets where relevant
4. API documentation (if applicable)
5. Key features
6. Project architecture
7. Dependencies
8. Contributing guidelines (simple)
9. License information (infer from codebase or use MIT as default)

Make the README clear, concise, and helpful for new developers. Use proper markdown formatting including headings, code blocks, lists, and tables where appropriate.
Directly provide the README Markdown, nothing else.
Update the title to match the project name and ensure it is professional and descriptive.

Project files:
${repoText}`,
    config: {
      maxOutputTokens: 2048,
      temperature: 0.2,
    },
  });

  const readmeContent = response.text;
  if (readmeContent) {
    await set(redisKey, readmeContent, expiry);
  }

  return readmeContent;
};

export const generateDiagram = async (owner, repo, ref, fileContents) => {
  const diagramRedisKey = `diagram:${owner}:${repo}:${ref}`;
  const expiry = 24 * 60 * 60;

  if (await exists(diagramRedisKey)) {
    console.log(`[CACHE] Getting diagram for ${owner}/${repo}/${ref}`);
    const cachedDiagram = await get(diagramRedisKey);
    const normalizedCachedDiagram = normalizeMermaidDiagram(cachedDiagram);

    if (normalizedCachedDiagram !== cachedDiagram) {
      await set(diagramRedisKey, normalizedCachedDiagram, expiry);
    }

    return normalizedCachedDiagram;
  }

  const repoText = fileContents
    .map((file) => `File: ${file.name}\nContent:\n${file.content}\n\n`)
    .join("");

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: `Generate a comprehensive Mermaid TD (top-down) graph diagram representing the architecture of the following codebase. 
        
The diagram should:
1. Identify key files, modules, and components
2. Show relationships and dependencies between components with proper arrows
3. Group related functionality together
4. Include clear labels for all nodes and connections
5. Focus on the main architectural flow rather than exhaustive details
6. Use appropriate styling (colors, shapes) to distinguish different types of components
7. Be simple enough to understand at a glance, but detailed enough to provide value
8. Be valid Mermaid syntax with no errors

Analyze the following code and extract the core architecture:

${repoText}

Return ONLY the Mermaid diagram code enclosed in \`\`\`mermaid and \`\`\` tags.`,
    config: {
      maxOutputTokens: 2048,
      temperature: 0.2,
    },
  });

  const diagramContent = normalizeMermaidDiagram(response.text);
  if (diagramContent) {
    await set(diagramRedisKey, diagramContent, expiry);
  }

  return diagramContent;
};

export const generatePullRequestReview = async (
  owner,
  repo,
  prNumber,
  diff,
  codebase,
  ignoreCache = false,
) => {
  const reviewRedisKey = `pr_review:${owner}:${repo}:${prNumber}`;
  const expiry = 24 * 60 * 60;

  if ((await exists(reviewRedisKey)) && !ignoreCache) {
    console.log(`[CACHE] Getting PR review for ${owner}/${repo}#${prNumber}`);
    return await get(reviewRedisKey);
  }

  const codebaseContent = codebase
    .map((file) => `File: ${file.name}\nContent:\n${file.content}\n\n`)
    .join("");

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: `Please provide a detailed code review for this pull request. Analyze both the changes and the overall codebase context.

**Pull Request Diff:**
\`\`\`diff
${diff}
\`\`\`

**Full Codebase Context:**
${codebaseContent}

Please provide a comprehensive review covering:
1. **Code Quality**: Assess the overall quality of the changes
2. **Best Practices**: Check adherence to coding standards and best practices
3. **Security**: Identify any potential security vulnerabilities
4. **Performance**: Evaluate performance implications
5. **Architecture**: Assess how changes fit into the overall architecture
6. **Testing**: Comment on test coverage and quality
7. **Documentation**: Check if documentation needs updates
8. **Suggestions**: Provide specific improvement suggestions

Give a strong opinion on whether the Pull Request should be merged, if not, then why not.

Format your response in markdown with clear sections.`,
    config: {
      maxOutputTokens: 4096,
      temperature: 0.3,
    },
  });

  const reviewContent = response.text.replaceAll("\`\`\`", "");
  if (reviewContent) {
    await set(reviewRedisKey, reviewContent, expiry);
  }

  return reviewContent;
};
