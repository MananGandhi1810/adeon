import { set, get, exists } from "./keyvalue-db.js";
import { getPRDiff, getRepoArchive, getPullRequestsNew } from "./github-api.js";
import { GoogleGenAI } from "@google/genai";
import tar from "tar-stream";
import zlib from "zlib";
import { Readable } from "stream";
import axios from "axios";
import sendEmail from "./email.js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const normalizeMermaidDiagram = (rawDiagram) => {
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

  // Accept valid Mermaid headers as-is.
  if (/^(graph|flowchart)\s+(TB|TD|BT|RL|LR)\b/i.test(diagram)) {
    return diagram;
  }

  // Convert legacy payloads like "td\n..." into valid Mermaid syntax.
  const directionMatch = diagram.match(/^(TB|TD|BT|RL|LR)\b/i);
  if (directionMatch) {
    const direction = directionMatch[1].toUpperCase();
    diagram = diagram.replace(/^(TB|TD|BT|RL|LR)\b\s*/i, "").trimStart();
    return `graph ${direction}${diagram ? `\n${diagram}` : ""}`;
  }

  // If no root directive is present, provide a safe default.
  return `graph TD\n${diagram}`;
};

const fetchStackOverflowForIssue = async (issueText, maxHits = 3) => {
  try {
    const searchUrl = "https://api.stackexchange.com/2.3/search/advanced";
    const params = {
      order: "desc",
      sort: "relevance",
      accepted: "True",
      title: issueText,
      site: "stackoverflow",
      pagesize: maxHits,
    };
    const resp = await axios.get(searchUrl, { params });
    const questions = resp.data.items || [];
    const hits = [];

    for (const q of questions) {
      const qid = q.question_id;
      const title = q.title;
      const link = q.link;

      // Fetch top answer for this question
      const ansUrl = `https://api.stackexchange.com/2.3/questions/${qid}/answers`;
      const ansParams = {
        order: "desc",
        sort: "votes",
        site: "stackoverflow",
        filter: "withbody",
        pagesize: 1,
      };
      
      try {
        const ansResp = await axios.get(ansUrl, { params: ansParams });
        const answers = ansResp.data.items || [];
        let accepted = null;
        if (answers.length > 0) {
          accepted = {
            answer_id: answers[0].answer_id,
            body: answers[0].body,
            is_accepted: answers[0].is_accepted || false,
          };
        }
        hits.push({
          question_id: qid,
          title: title,
          link: link,
          accepted_answer: accepted,
        });
      } catch (err) {
        console.error(`[StackOverflow Answer Error] ${err.message}`);
        hits.push({
          question_id: qid,
          title: title,
          link: link,
          accepted_answer: null,
        });
      }
    }
    return hits;
  } catch (error) {
    console.error(`[StackOverflow API error] ${error.message}`);
    return [];
  }
};

const extractJsonArray = (text) => {
  if (!text) return [];
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {}

  // Fallback: finding first [ and last ]
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) {
    try {
      const candidate = JSON.parse(cleaned.substring(start, end + 1));
      if (Array.isArray(candidate)) return candidate;
    } catch (e) {}
  }
  return [];
};

const generateReadme = async (owner, repo, ref, fileContents) => {
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

const generateDiagram = async (owner, repo, ref, fileContents) => {
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

const generatePullRequestReview = async (
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

  const reviewContent = response.text.replaceAll("```", "");
  if (reviewContent) {
    await set(reviewRedisKey, reviewContent, expiry);
  }

  return reviewContent;
};

const generateBugDetect = async (owner, repo, ref, fileContents) => {
  const bugCacheKey = `bug_detect:${owner}:${repo}:${ref}`;
  const expiry = 24 * 60 * 60;

  if (await exists(bugCacheKey)) {
    console.log(`[CACHE] Getting bug detection for ${owner}/${repo}/${ref}`);
    return JSON.parse(await get(bugCacheKey));
  }

  const results = {};
  // Limit to core files to avoid hitting token limits or being too slow
  const coreFiles = fileContents.filter(f => 
    /\.(js|jsx|ts|tsx|py|java|cpp|c|cs|rb|go|php)$/i.test(f.name) && 
    !f.name.includes("node_modules") && 
    !f.name.includes(".git")
  ).slice(0, 15); // Increased to 15 files

  for (const file of coreFiles) {
    const language = file.name.split(".").pop();
    const prompt = `
You are a senior security engineer.
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
${file.content}
`;
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: prompt,
        config: { temperature: 0.1 }
      });
      const bugs = extractJsonArray(response.text);
      
      // Enrich with StackOverflow
      const enrichedBugs = [];
      for (const bug of bugs) {
        const soHits = await fetchStackOverflowForIssue(bug.issue, 3);
        bug.stackoverflow_hits = soHits;
        enrichedBugs.push(bug);
      }

      results[file.name] = {
        language: language,
        bug_report: enrichedBugs
      };
    } catch (err) {
      console.error(`Error detecting bugs in ${file.name}:`, err);
    }
  }

  await set(bugCacheKey, JSON.stringify(results), expiry);
  return results;
};

const generateMocks = async (owner, repo, ref, fileContents) => {
  const mockCacheKey = `mocks:${owner}:${repo}:${ref}`;
  const expiry = 24 * 60 * 60;

  if (await exists(mockCacheKey)) {
    return JSON.parse(await get(mockCacheKey));
  }

  const results = {};
  const coreFiles = fileContents.filter(f => 
    /\.(js|jsx|ts|tsx|py|java|cpp|c|cs|rb|go|php)$/i.test(f.name) && 
    !f.name.includes("node_modules") && 
    !f.name.includes(".git")
  ).slice(0, 10);

  for (const file of coreFiles) {
    const language = file.name.split(".").pop();
    const prompt = `
Given the following ${language} code (functions/classes/modules), generate:
- Realistic test input data for each function/class (both valid and invalid edge cases)
- Example mocks for any APIs, DB calls, or external services used (use common mocking tools for the language)
Output ONLY the code, one test function per example (named test_*), ready to copy-paste. No explanations. No markdown fences.

Code:
${file.content}
`;
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: prompt,
        config: { temperature: 0.2 }
      });
      results[file.name] = {
        language: language,
        mock_data: response.text.replace(/^```[\w]*\n/, "").replace(/```$/, "").trim()
      };
    } catch (err) {
      console.error(`Error generating mocks for ${file.name}:`, err);
    }
  }

  await set(mockCacheKey, JSON.stringify(results), expiry);
  return results;
};

const generateTests = async (owner, repo, ref, fileContents) => {
  const testCacheKey = `tests:${owner}:${repo}:${ref}`;
  const expiry = 24 * 60 * 60;

  if (await exists(testCacheKey)) {
    return JSON.parse(await get(testCacheKey));
  }

  const results = {};
  const coreFiles = fileContents.filter(f => 
    /\.(js|jsx|ts|tsx|py|java|cpp|c|cs|rb|go|php)$/i.test(f.name) && 
    !f.name.includes("node_modules") && 
    !f.name.includes(".git")
  ).slice(0, 10);

  for (const file of coreFiles) {
    const language = file.name.split(".").pop();
    const prompt = `
Given the following ${language} code, generate comprehensive unit/integration test code using the standard test framework for that language.
Return ONLY the test code as plain text, WITHOUT explanations, comments, or markdown fences.
Format output to be copy-paste ready with correct indentation and line breaks.

Code:
${file.content}
`;
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: prompt,
        config: { temperature: 0.2 }
      });
      results[file.name] = {
        language: language,
        test_cases: response.text.replace(/^```[\w]*\n/, "").replace(/```$/, "").trim()
      };
    } catch (err) {
      console.error(`Error generating tests for ${file.name}:`, err);
    }
  }

  await set(testCacheKey, JSON.stringify(results), expiry);
  return results;
};

const chatWithCode = async (owner, repo, ref, messages, githubToken) => {
  const allFileContents = await getRepoContents(owner, repo, ref, githubToken);
  
  if (!allFileContents) {
    throw new Error("Could not fetch repository contents for chat context");
  }

  // Concatenate codebase context (limit to avoid token overflow)
  const coreFiles = allFileContents.filter(f => 
    /\.(js|jsx|ts|tsx|py|java|cpp|c|cs|rb|go|php|md|txt|json)$/i.test(f.name) && 
    !f.name.includes("node_modules") && 
    !f.name.includes(".git") &&
    !f.name.includes("pnpm-lock.yaml") &&
    !f.name.includes("package-lock.json")
  ).slice(0, 50); // Take more files for chat context

  const codeBlob = coreFiles
    .map((file) => `File: ${file.name}\nContent:\n${file.content}\n\n`)
    .join("")
    .slice(0, 100000); // Limit to ~100k chars

  const systemPrompt = `You are a helpful AI assistant specialized in analyzing code. 
Below is the codebase for the repository ${owner}/${repo}. Use it to answer the user’s questions accurately. 
If you need to reference a file or snippet, quote the relevant lines.

Codebase Context:
${codeBlob}
`;

  const chatPrompt = messages.map(msg => {
    const role = msg.role === "system" ? "[System]" : msg.role === "user" ? "[User]" : "[Assistant]";
    return `${role}: ${msg.content}`;
  }).join("\n");

  const finalPrompt = `[System]: ${systemPrompt}\n${chatPrompt}\n[Assistant]:`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: finalPrompt,
    config: { 
      temperature: 0.7,
      maxOutputTokens: 2048
    }
  });

  return { reply: response.text };
};

const extractContentsFromArchive = (archiveData) => {
  return new Promise((resolve, reject) => {
    const allFileContents = [];
    const extract = tar.extract();
    const gunzip = zlib.createGunzip();

    extract.on("entry", (header, stream, next) => {
      if (header.type === "file") {
        const textFileExtensions = [
          ".txt",
          ".md",
          ".js",
          ".jsx",
          ".ts",
          ".tsx",
          ".html",
          ".css",
          ".json",
          ".yaml",
          ".yml",
          ".xml",
          ".csv",
          ".py",
          ".java",
          ".c",
          ".cpp",
          ".h",
          ".rb",
          ".php",
          ".go",
        ];
        const fileName = header.name.toLowerCase();
        const isTextFile = textFileExtensions.some((ext) =>
          fileName.endsWith(ext),
        );

        if (isTextFile) {
          let content = "";
          stream.on("data", (chunk) => {
            content += chunk.toString("utf8");
          });
          stream.on("end", () => {
            allFileContents.push({ name: header.name, content });
            next();
          });
          stream.resume();
        } else {
          stream.resume();
          next();
        }
      } else {
        stream.resume();
        next();
      }
    });

    extract.on("finish", () => {
      resolve(allFileContents);
    });

    extract.on("error", reject);

    const readableStream = new Readable();
    readableStream._read = () => {};
    readableStream.push(Buffer.from(archiveData));
    readableStream.push(null);

    readableStream.pipe(gunzip).pipe(extract);
  });
};

const processPullRequest = async (pullRequestPayload, githubToken) => {
  if (
    !pullRequestPayload ||
    !pullRequestPayload.head ||
    !pullRequestPayload.head.sha ||
    !pullRequestPayload.number ||
    !pullRequestPayload.base ||
    !pullRequestPayload.base.repo ||
    !pullRequestPayload.base.repo.full_name
  ) {
    return null;
  }

  const commitHash = pullRequestPayload.head.sha;
  const prNumber = pullRequestPayload.number;
  const prTitle = pullRequestPayload.title;
  const prDescription = pullRequestPayload.body || "";
  const repoFullName = pullRequestPayload.base.repo.full_name;
  const [owner, repoName] = repoFullName.split("/");

  const repoContentsPromise = await getRepoContents(
    owner,
    repoName,
    commitHash,
    githubToken,
  );
  const prDiffPromise = await getPRDiff(
    owner,
    repoName,
    prNumber,
    githubToken,
  ).then((r) => r.data);

  const [repoContents, prDiff] = await Promise.all([
    repoContentsPromise,
    prDiffPromise,
  ]);

  const review = await generatePullRequestReview(
    owner,
    repoName,
    prNumber,
    prDiff,
    repoContents,
    prTitle,
    prDescription,
  );
  return {
    number: pullRequestPayload.number,
    title: pullRequestPayload.title,
    state: pullRequestPayload.state,
    url: pullRequestPayload.html_url,
    createdAt: pullRequestPayload.created_at,
    updatedAt: pullRequestPayload.updated_at,
    aiReview: review,
  };
};

const getRepoContents = async (owner, repo, ref, githubToken) => {
  const repoContentsKey = `repo_contents:${owner}:${repo}:${ref}`;
  const expiry = 24 * 60 * 60;

  let allFileContents;

  if (await exists(repoContentsKey)) {
    console.log(`[CACHE] Getting repo contents for ${owner}/${repo}/${ref}`);
    const cachedContents = await get(repoContentsKey);
    allFileContents = JSON.parse(cachedContents);
    return allFileContents;
  }
  const archiveResponse = await getRepoArchive(owner, repo, ref, githubToken);

  if (archiveResponse.status !== 200 || !archiveResponse.data) {
    return null;
  }

  allFileContents = await extractContentsFromArchive(archiveResponse.data);

  await set(repoContentsKey, JSON.stringify(allFileContents), expiry);

  return allFileContents;
};

const processPush = async (
  owner,
  repo,
  ref,
  githubToken,
  initial = {
    initial: false,
    userEmail: "",
  },
  requirements = {
    readme: true,
    diagram: true,
    bugDetect: true,
    mocks: true,
    tests: true,
  },
) => {
  const allFileContents = await getRepoContents(owner, repo, ref, githubToken);

  if (!allFileContents) {
    return {
      data: {
        readme: null,
        diagram: null,
        bugDetect: null,
        mocks: null,
        tests: null,
      },
    };
  }

  const aiPayload = {
    owner,
    repo,
    token: githubToken,
    codeCacheKey: `repo_contents:${owner}:${repo}:${ref}`,
  };

  let readmePromise = null;
  let diagramPromise = null;
  let bugDetectPromise = null;
  let generateMocksPromise = null;
  let generateTestsPromise = null;
  if (requirements.readme) {
    readmePromise = generateReadme(owner, repo, ref, allFileContents).catch(
      (r) => {
        console.log("Error generating README:", r);
        return null;
      },
    );
  }
  if (requirements.diagram) {
    diagramPromise = generateDiagram(owner, repo, ref, allFileContents).catch(
      (r) => {
        console.log("Error generating diagram:", r);
        return null;
      },
    );
  }
  if (requirements.bugDetect) {
    bugDetectPromise = generateBugDetect(owner, repo, ref, allFileContents).catch(
      (r) => {
        console.log("Error detecting bugs:", r);
        return null;
      },
    );
  }
  if (requirements.mocks) {
    generateMocksPromise = generateMocks(owner, repo, ref, allFileContents).catch(
      (r) => {
        console.log("Error generating mocks:", r);
        return null;
      },
    );
  }
  if (requirements.tests) {
    generateTestsPromise = generateTests(owner, repo, ref, allFileContents).catch(
      (r) => {
        console.log("Error generating tests:", r);
        return null;
      },
    );
  }
  const [readme, diagram, bugDetect, mocks, tests] = await Promise.all([
    requirements.readme ? readmePromise : Promise.resolve(undefined),
    requirements.diagram ? diagramPromise : Promise.resolve(undefined),
    requirements.bugDetect ? bugDetectPromise : Promise.resolve(undefined),
    requirements.mocks ? generateMocksPromise : Promise.resolve(undefined),
    requirements.tests ? generateTestsPromise : Promise.resolve(undefined),
  ]);

  if (initial.initial && initial.userEmail && initial.userEmail.trim() != "") {
    sendEmail(
      initial.userEmail,
      "New Project Processed",
      `The new project ${owner}/${repo} has been processed.`,
    );
  }
  return { data: { readme, diagram, bugDetect, mocks, tests } };
};

const processAllPullRequests = async (
  owner,
  repo,
  githubToken,
  ignoreCache = false,
) => {
  const pullRequestsKey = `pull_requests_open:${owner}:${repo}`;
  const expiry = 24 * 60 * 60;

  if ((await exists(pullRequestsKey)) && !ignoreCache) {
    console.log(`[CACHE] Getting all pull requests for ${owner}/${repo}`);
    const cachedPRs = await get(pullRequestsKey);
    const parsedPRs = JSON.parse(cachedPRs);
    return parsedPRs;
  }
  const pullRequests = await getPullRequestsNew(owner, repo, githubToken);

  if (!pullRequests || pullRequests.length === 0) {
    return [];
  }

  const pullRequestsPromises = [];

  for (const pr of pullRequests) {
    if (pr.state === "open") {
      const prPromise = processPullRequest(pr, githubToken);
      pullRequestsPromises.push(prPromise);
    }
  }
  const processedPRs = await Promise.all(pullRequestsPromises);

  await set(pullRequestsKey, JSON.stringify(processedPRs), expiry);

  return processedPRs;
};

const processSinglePullRequest = async (
  owner,
  repo,
  githubToken,
  projectId,
  pullRequestPayload,
  action,
) => {
  const pullRequestsKey = `pull_requests_open:${owner}:${repo}`;
  const expiry = 24 * 60 * 60;

  let existingPRs = [];
  if (await exists(pullRequestsKey)) {
    console.log(
      `[CACHE] Getting single pull request from cached list for ${owner}/${repo}`,
    );
    const cachedPRs = await get(pullRequestsKey);
    existingPRs = JSON.parse(cachedPRs);
  } else {
    return await processAllPullRequests(owner, repo, githubToken);
  }

  const prNumber = pullRequestPayload.number;

  if (action === "opened" && pullRequestPayload.state === "open") {
    const newPR = await processPullRequest(pullRequestPayload, githubToken);
    if (newPR) {
      const existingIndex = existingPRs.findIndex(
        (pr) => pr.number === prNumber,
      );
      if (existingIndex === -1) {
        existingPRs.push(newPR);
      } else {
        existingPRs[existingIndex] = newPR;
      }
    }
  } else if (action === "closed") {
    existingPRs = existingPRs.filter((pr) => pr.number !== prNumber);
  } else if (action === "synchronize" || action === "edited") {
    const existingIndex = existingPRs.findIndex((pr) => pr.number === prNumber);
    if (existingIndex !== -1 && pullRequestPayload.state === "open") {
      const prReview = await processPullRequest(
        pullRequestPayload,
        githubToken,
      );
      if (prReview) {
        existingPRs[existingIndex] = prReview;
      }
    }
  }

  await set(pullRequestsKey, JSON.stringify(existingPRs), expiry);

  return existingPRs;
};

export {
  processPullRequest,
  processPush,
  generateReadme,
  generateDiagram,
  normalizeMermaidDiagram,
  processAllPullRequests,
  generatePullRequestReview,
  processSinglePullRequest,
  generateBugDetect,
  generateMocks,
  generateTests,
  chatWithCode,
};
