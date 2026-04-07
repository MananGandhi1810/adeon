import { PrismaClient } from "@prisma/client";
import { createWebhook } from "../utils/github-api.js";
import {
  processPush,
  processAllPullRequests,
  processSinglePullRequest,
  normalizeMermaidDiagram,
} from "../utils/processing.js";
import Docker from "dockerode";
import { set, get } from "../utils/keyvalue-db.js";

const prisma = new PrismaClient();
const docker = new Docker();
const ghRepoRegex =
  /https?:\/\/(www\.)?github.com\/(?<owner>[\w.-]+)\/(?<name>[\w.-]+)/;

const getRequestBaseProtocol = (req) => {
  const protocolHeader = req.headers["x-forwarded-proto"];
  return protocolHeader ? protocolHeader.split(",")[0].trim() : req.protocol;
};

const getContainerUrl = (req, port) => {
  const protocol = getRequestBaseProtocol(req);
  return `${protocol}://${req.hostname}:${port}`;
};

const runExecAndWait = async (execInstance) => {
  const stream = await execInstance.start();
  let output = "";

  await new Promise((resolve, reject) => {
    stream.on("data", (chunk) => {
      output += chunk.toString("utf8");
    });
    stream.on("end", resolve);
    stream.on("error", reject);
  });

  const inspect = await execInstance.inspect();
  return {
    exitCode: inspect.ExitCode,
    output: output.trim(),
  };
};

const getProjectDataHandler = async (req, res) => {
  const { projectId } = req.params;

  const project = await prisma.project.findUnique({
    where: { id: projectId, userId: req.user.id },
    include: { user: true },
  });

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found",
      data: null,
    });
  }

  const match = project.repoUrl.match(ghRepoRegex);
  if (!match) {
    return res.status(400).json({
      success: false,
      message: "Invalid repository URL",
      data: null,
    });
  }

  const owner = match.groups.owner;
  const repoName = match.groups.name;
  const ghAccessToken = project.user.ghAccessToken;

  const pushPromise = processPush(owner, repoName, "main", ghAccessToken);
  const pullRequestPromise = processAllPullRequests(
    owner,
    repoName,
    ghAccessToken,
  );
  const projectData = await Promise.all([pushPromise, pullRequestPromise]);
  if (projectData == null) {
    return res.status(500).json({
      success: false,
      message: "Could not process data",
      data: null,
    });
  }
  const [
    {
      data: { readme, diagram, bugDetect, mocks, tests },
    },
    pullRequests,
  ] = projectData;

  return res.json({
    success: true,
    message: "Project found",
    data: {
      project,
      readme,
      diagram,
      pullRequests,
      aiAnalysis: {
        tests: tests,
        mocks: mocks,
        bugs: bugDetect,
      },
    },
  });
};

const incomingProjectWebhookHandler = async (req, res) => {
  const { projectId } = req.params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { user: true },
  });
  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found",
      data: null,
    });
  }
  const match = project.repoUrl.match(ghRepoRegex);

  const githubEvent = req.headers["x-github-event"];

  if (githubEvent === "push") {
    const ref = req.body.ref;
    if (!ref) {
      return;
    }
    const branch = ref.split("/").pop();
    if (branch === "main" || branch === "master") {
      await processPush(
        match.groups.owner,
        match.groups.name,
        req.body.head_commit.id,
        project.user.ghAccessToken,
      );
    }
  } else if (githubEvent === "pull_request") {
    const pullRequestAction = req.body.action;

    const repoFullName = req.body.pull_request.base.repo.full_name;
    const [owner, repo] = repoFullName.split("/");

    await processSinglePullRequest(
      owner,
      repo,
      project.user.ghAccessToken,
      projectId,
      req.body.pull_request,
      pullRequestAction,
    );
  } else if (githubEvent == "ping") {
    await Promise.all([
      processPush(
        match.groups.owner,
        match.groups.name,
        "HEAD",
        project.user.ghAccessToken,
      ),
      processAllPullRequests(
        match.groups.owner,
        match.groups.name,
        project.user.ghAccessToken,
        project.id,
        true,
      ),
    ]);
  }

  return res.json({
    success: true,
    message: "Webhook received",
    data: null,
  });
};

const projectListHandler = async (req, res) => {
  const { id } = req.user;

  const projectData = await prisma.project.findMany({
    where: { userId: id },
  });

  return res.json({
    success: true,
    message: "project data found",
    data: {
      projectData,
    },
  });
};

const createProjectHandler = async (req, res) => {
  const { repo: url, title, description } = req.query;
  const ghAccessToken = req.user.ghAccessToken;

  console.log("[createProjectHandler] incoming request", {
    userId: req.user?.id,
    repoUrl: url,
    title,
  });

  if (!url || url.trim() === "") {
    return res.status(400).json({
      success: false,
      message: "Repository URL is required",
      data: null,
    });
  }

  const match = url.match(ghRepoRegex);
  if (!match) {
    return res.status(400).json({
      success: false,
      message: "Invalid GitHub repository URL",
      data: null,
    });
  }

  const repo = `${match.groups.owner}/${match.groups.name}`;

  const existingProject = await prisma.project.count({
    where: { repoUrl: url },
  });

  if (existingProject > 0) {
    return res.status(400).json({
      success: false,
      message: "A project with this repository already exists",
      data: null,
    });
  }

  const project = await prisma.project.create({
    data: {
      title,
      description,
      repoUrl: url,
      userId: req.user.id,
    },
  });

  const webhookResponse = await createWebhook(
    ghAccessToken,
    repo,
    `project/${project.id}`,
    ["push", "pull_request"],
  );
  if (webhookResponse.status != 201) {
    console.error("[createProjectHandler] webhook creation failed", {
      userId: req.user?.id,
      projectId: project.id,
      repo,
      webhookStatus: webhookResponse.status,
      webhookResponse: webhookResponse.data,
    });

    await prisma.project.delete({
      where: { id: project.id },
    });
    return res.status(400).json({
      success: false,
      message: "Repository not found",
      data: null,
    });
  }
  processPush(match.groups.owner, match.groups.name, "HEAD", ghAccessToken, {
    initial: true,
    userEmail: req.user.email,
  });
  res.json({
    success: true,
    message: "Project created successfully",
    data: {
      project,
    },
  });
};

const provisionProjectHandler = async (req, res) => {
  const { projectId } = req.params;

  const project = await prisma.project.findUnique({
    where: { id: projectId, userId: req.user.id },
    include: { user: true },
  });

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found",
      data: null,
    });
  }

  const containerKey = `project:${projectId}:container`;
  const existingContainer = await get(containerKey);

  if (existingContainer) {
    const containerData = JSON.parse(existingContainer);
    return res.json({
      success: true,
      message: "Project already provisioned",
      data: {
        project,
        containerId: containerData.containerId,
        containerName: containerData.containerName,
        port: containerData.port,
        url: getContainerUrl(req, containerData.port),
        repository: containerData.repository,
        createdAt: containerData.createdAt,
      },
    });
  }

  const match = project.repoUrl.match(ghRepoRegex);

  if (!match) {
    return res.status(400).json({
      success: false,
      message: "Invalid repository URL",
      data: null,
    });
  }

  const { owner, name } = match.groups;

  try {
    const containerName = `code-server-${projectId}-${Date.now()}`;
    const container = await docker.createContainer({
      Image: "ghcr.io/manangandhi1810/10000x-devs-code-server:latest",
      Cmd: ["/home/coder", "--auth", "none"],
      name: containerName,
      Tty: true,
      WorkingDir: "/home/coder/workspace",
      ExposedPorts: {
        "8080/tcp": {},
      },
      HostConfig: {
        AutoRemove: true,
        PortBindings: {
          "8080/tcp": [
            {
              HostPort: "0",
            },
          ],
        },
      },
    });

    await container.start();

    const createDirExec = await container.exec({
      Cmd: [
        "sh",
        "-lc",
        "mkdir -p /home/coder/workspace && chown 1000:1000 /home/coder/workspace && chmod u+rwx /home/coder/workspace",
      ],
      User: "0:0",
      AttachStdout: true,
      AttachStderr: true,
    });
    const mkdirResult = await runExecAndWait(createDirExec);
    if (mkdirResult.exitCode !== 0) {
      throw new Error(
        `Failed to prepare workspace directory: ${mkdirResult.output || "unknown error"}`,
      );
    }

    const repoUrl = project.user.ghAccessToken
      ? `https://${project.user.ghAccessToken}@github.com/${owner}/${name}.git`
      : `https://github.com/${owner}/${name}.git`;

    const cloneExec = await container.exec({
      Cmd: ["git", "clone", repoUrl, "/home/coder/workspace"],
      User: "1000:1000",
      AttachStdout: true,
      AttachStderr: true,
      WorkingDir: "/home/coder",
    });
    const cloneResult = await runExecAndWait(cloneExec);
    if (cloneResult.exitCode !== 0) {
      throw new Error(
        `Repository clone failed: ${cloneResult.output || "unknown error"}`,
      );
    }

    const containerInfo = await container.inspect();
    const hostPort =
      containerInfo.NetworkSettings.Ports["8080/tcp"]?.[0]?.HostPort;

    await set(
      containerKey,
      JSON.stringify({
        containerId: container.id,
        containerName: containerName,
        port: hostPort,
        repository: `${owner}/${name}`,
        createdAt: new Date().toISOString(),
      }),
      24 * 60 * 60,
    );

    return res.json({
      success: true,
      message: "Project provisioned successfully",
      data: {
        project,
        containerId: container.id,
        containerName: containerName,
        port: hostPort,
        url: getContainerUrl(req, hostPort),
        repository: `${owner}/${name}`,
      },
    });
  } catch (error) {
    console.error("Error provisioning project:", error);
    return res.status(500).json({
      success: false,
      message: "Error provisioning project",
      data: null,
    });
  }
};

const projectChatHandler = async (req, res) => {
  const { projectId } = req.params;
  const { owner, repo, messages } = req.body;

  if (!owner || !repo || !messages) {
    return res.status(400).json({
      success: false,
      message: "Request body must contain owner, repo, and messages.",
      data: null,
    });
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Messages must be a non-empty array.",
      data: null,
    });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId, userId: req.user.id },
  });

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found",
      data: null,
    });
  }
  try {
    const aiServiceBaseUrl =
      process.env.AI_SERVICE_BASE_URL || "http://127.0.0.1:8888";
    const payloadToAiService = {
      owner: owner,
      repo: repo,
      token: req.user.ghAccessToken,
      messages: messages,
    };

    const aiResponse = await fetch(`${aiServiceBaseUrl}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadToAiService),
    });

    if (aiResponse.ok) {
      const responseData = await aiResponse.json();
      return res.json({
        success: true,
        message: "AI chat response received",
        data: responseData,
      });
    } else {
      const errorText = await aiResponse.text();
      console.error(
        `Error from AI service /chat for project ${projectId} (using payload owner/repo):`,
        aiResponse.status,
        errorText,
      );
      return res.status(aiResponse.status).json({
        success: false,
        message: `Error from AI service: ${errorText}`,
        data: null,
      });
    }
  } catch (error) {
    console.error(
      `Error in projectChatHandler for project ${projectId}:`,
      error,
    );
    return res.status(500).json({
      success: false,
      message: "Internal server error while processing chat request.",
      data: null,
    });
  }
};

const getProjectReadmeHandler = async (req, res) => {
  const { projectId } = req.params;
  const project = await prisma.project.findUnique({
    where: { id: projectId, userId: req.user.id },
    include: { user: true },
  });

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found",
      data: null,
    });
  }

  const match = project.repoUrl.match(ghRepoRegex);
  if (!match) {
    return res.status(400).json({
      success: false,
      message: "Invalid repository URL",
      data: null,
    });
  }

  const owner = match.groups.owner;
  const repoName = match.groups.name;
  const ghAccessToken = project.user.ghAccessToken;

  const {
    data: { readme },
  } = await processPush(
    owner,
    repoName,
    "main",
    ghAccessToken,
    {},
    { readme: true },
  );

  return res.json({
    success: true,
    message: "Project readme found",
    data: { readme },
  });
};

const getProjectDiagramHandler = async (req, res) => {
  const { projectId } = req.params;
  const project = await prisma.project.findUnique({
    where: { id: projectId, userId: req.user.id },
    include: { user: true },
  });

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found",
      data: null,
    });
  }

  const match = project.repoUrl.match(ghRepoRegex);
  if (!match) {
    return res.status(400).json({
      success: false,
      message: "Invalid repository URL",
      data: null,
    });
  }

  const owner = match.groups.owner;
  const repoName = match.groups.name;
  const ghAccessToken = project.user.ghAccessToken;

  const {
    data: { diagram },
  } = await processPush(
    owner,
    repoName,
    "main",
    ghAccessToken,
    {},
    { diagram: true },
  );

  return res.json({
    success: true,
    message: "Project diagram found",
    data: { diagram: normalizeMermaidDiagram(diagram) },
  });
};

const getProjectBugDetectHandler = async (req, res) => {
  const { projectId } = req.params;
  const project = await prisma.project.findUnique({
    where: { id: projectId, userId: req.user.id },
    include: { user: true },
  });

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found",
      data: null,
    });
  }

  const match = project.repoUrl.match(ghRepoRegex);
  if (!match) {
    return res.status(400).json({
      success: false,
      message: "Invalid repository URL",
      data: null,
    });
  }

  const owner = match.groups.owner;
  const repoName = match.groups.name;
  const ghAccessToken = project.user.ghAccessToken;

  const {
    data: { bugDetect },
  } = await processPush(
    owner,
    repoName,
    "main",
    ghAccessToken,
    {},
    { bugDetect: true },
  );

  return res.json({
    success: true,
    message: "Project bug detection results found",
    data: { bugDetect },
  });
};

const getProjectMocksHandler = async (req, res) => {
  const { projectId } = req.params;
  const project = await prisma.project.findUnique({
    where: { id: projectId, userId: req.user.id },
    include: { user: true },
  });

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found",
      data: null,
    });
  }

  const match = project.repoUrl.match(ghRepoRegex);
  if (!match) {
    return res.status(400).json({
      success: false,
      message: "Invalid repository URL",
      data: null,
    });
  }

  const owner = match.groups.owner;
  const repoName = match.groups.name;
  const ghAccessToken = project.user.ghAccessToken;

  const {
    data: { mocks },
  } = await processPush(
    owner,
    repoName,
    "main",
    ghAccessToken,
    {},
    { mocks: true },
  );

  return res.json({
    success: true,
    message: "Project mocks found",
    data: { mocks },
  });
};

const getProjectTestsHandler = async (req, res) => {
  const { projectId } = req.params;
  const project = await prisma.project.findUnique({
    where: { id: projectId, userId: req.user.id },
    include: { user: true },
  });

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found",
      data: null,
    });
  }

  const match = project.repoUrl.match(ghRepoRegex);
  if (!match) {
    return res.status(400).json({
      success: false,
      message: "Invalid repository URL",
      data: null,
    });
  }

  const owner = match.groups.owner;
  const repoName = match.groups.name;
  const ghAccessToken = project.user.ghAccessToken;

  const {
    data: { tests },
  } = await processPush(
    owner,
    repoName,
    "main",
    ghAccessToken,
    { initial: false, userEmail: "" },
    { tests: true },
  );

  return res.json({
    success: true,
    message: "Project tests found",
    data: { tests },
  });
};

export {
  getProjectDataHandler,
  incomingProjectWebhookHandler,
  projectListHandler,
  createProjectHandler,
  provisionProjectHandler,
  projectChatHandler,
  getProjectReadmeHandler,
  getProjectDiagramHandler,
  getProjectBugDetectHandler,
  getProjectMocksHandler,
  getProjectTestsHandler,
};
