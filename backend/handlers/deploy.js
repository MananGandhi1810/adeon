import { PrismaClient } from "@prisma/client";
import Docker from "dockerode";
import { createProxyMiddleware } from "http-proxy-middleware";
import { createWebhook } from "../utils/github-api.js";
import { sendQueueMessage } from "../utils/queue-manager.js";

const prisma = new PrismaClient();
const docker = new Docker();
const ghRepoRegex =
  /https?:\/\/(www\.)?github.com\/(?<owner>[\w.-]+)\/(?<name>[\w.-]+)/;

const getRequestProtocol = (req) => {
  const protocolHeader = req.headers["x-forwarded-proto"];
  return protocolHeader ? protocolHeader.split(",")[0].trim() : req.protocol;
};

const getDeploymentAppUrl = (req, containerPort) => {
  if (!containerPort) {
    return null;
  }
  return `${getRequestProtocol(req)}://${req.hostname}:${containerPort}`;
};

const frameworks = [
  "Node",
  "React",
  "Express",
  "Next",
  "Flask",
  "Django",
  "Docker",
  "Other",
];

const newDeploymentHandler = async (req, res) => {
  const { name, description, githubUrl, envSecrets, framework } = req.body;

  if (!name || !githubUrl || !framework) {
    return res.status(400).json({
      success: false,
      message: "Name, Github URL and Framework are required",
      data: null,
    });
  }

  if (!frameworks.includes(framework)) {
    return res.status(400).json({
      success: false,
      message: "Framework not accepted",
      data: null,
    });
  }

  let processedEnvSecrets;
  if (envSecrets && Array.isArray(envSecrets)) {
    processedEnvSecrets = envSecrets.map((secret) => {
      if (
        secret == undefined ||
        secret.key == undefined ||
        secret.value == undefined ||
        secret.key.trim() == "" ||
        secret.value.trim() == ""
      ) {
        return;
      }
      return { key: secret.key, value: secret.value };
    });
  } else {
    processedEnvSecrets = [];
  }
  processedEnvSecrets =
    processedEnvSecrets == undefined ? [] : processedEnvSecrets;

  let id;
  do {
    id = Math.floor(Math.random() * 1000000).toString();
  } while (
    await prisma.deployment.findUnique({
      where: {
        id,
      },
    })
  );
  const match = githubUrl.match(ghRepoRegex);
  const repo = `${match.groups.owner}/${match.groups.name}`;
  const webhookRequest = await createWebhook(
    req.user.ghAccessToken,
    repo,
    "deployment/" + id + "/hooks/",
    ["push"],
  );
  console.log(webhookRequest.data);

  if (!webhookRequest || webhookRequest.data.id == undefined) {
    return res.status(400).json({
      success: false,
      message: "GitHub Repo is invalid or cannot be accessed",
      data: null,
    });
  }

  var deployment;
  try {
    deployment = await prisma.deployment.create({
      data: {
        id,
        name,
        description,
        framework,
        webhookId: webhookRequest.data.id.toString(),
        userId: req.user.id,
        envSecrets: {
          create: processedEnvSecrets,
        },
        githubUrl: repo,
      },
    });
  } catch (e) {
    console.log(e);
    return res.status(500).json({
      success: false,
      message: "deployment could not be created",
      data: null,
    });
  }
  return res.json({
    success: true,
    message: "deployment created succesfully",
    data: {
      deployment,
    },
  });
};

const getAllDeploymentsHandler = async (req, res) => {
  const deployments = await prisma.deployment.findMany({
    where: {
      userId: req.user.id,
    },
  });
  res.json({
    success: true,
    message: "deployments fetched succesfully",
    data: {
      deployments,
    },
  });
};

const getDeploymentByIdHandler = async (req, res) => {
  const { deploymentId } = req.params;
  if (!deploymentId) {
    return res.status(400).json({
      success: false,
      message: "deployment Id is required",
      data: null,
    });
  }
  const deployment = await prisma.deployment.findUnique({
    where: {
      id: deploymentId,
      userId: req.user.id,
    },
    include: {
      envSecrets: true,
    },
  });
  if (!deployment) {
    return res.status(404).json({
      success: false,
      message: "This deployment does not exist",
      data: null,
    });
  }
  const appUrl = getDeploymentAppUrl(req, deployment.containerPort);

  res.json({
    success: true,
    message: "Deployment found",
    data: {
      deployment: {
        ...deployment,
        appUrl,
      },
    },
  });
};

const startDeploymentHandler = async (req, res) => {
  const { deploymentId } = req.params;
  if (!deploymentId) {
    return res.status(400).json({
      success: false,
      message: "Deployment Id is required",
      data: null,
    });
  }
  const deployment = await prisma.deployment.findUnique({
    where: {
      id: deploymentId,
    },
    select: {
      containerId: true,
    },
  });
  if (!deployment) {
    return res.status(404).json({
      success: false,
      message: "deployment not found",
      data: null,
    });
  }
  try {
    const container = docker.getContainer(deployment.containerId);
    const containerState = (await container.inspect()).State.Status;
    if (containerState == "running") {
      await container.start();
    }
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: "Could not start deployment",
      data: null,
    });
  }
  res.json({
    success: true,
    message: "deployment started succesfully",
    data: null,
  });
};

const stopDeploymentHandler = async (req, res) => {
  const { deploymentId } = req.params;
  if (!deploymentId) {
    return res.status(400).json({
      success: false,
      message: "deployment Id is required",
      data: null,
    });
  }
  const deployment = await prisma.deployment.findUnique({
    where: {
      id: deploymentId,
    },
    select: {
      containerId: true,
    },
  });
  if (!deployment) {
    return res.status(404).json({
      success: false,
      message: "deployment not found",
      data: null,
    });
  }
  try {
    const container = docker.getContainer(deployment.containerId);
    const containerState = (await container.inspect()).State.Status;
    if (containerState == "running") {
      await container.kill();
    }
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: "Could not stop deployment",
      data: null,
    });
  }
  res.json({
    success: true,
    message: "deployment stopped succesfully",
    data: null,
  });
};

const getDeploymentStatusHandler = async (req, res) => {
  const { deploymentId } = req.params;
  if (!deploymentId) {
    return res.status(400).json({
      success: false,
      message: "deployment Id is required",
      data: null,
    });
  }
  const deployment = await prisma.deployment.findUnique({
    where: {
      id: deploymentId,
    },
    select: {
      containerId: true,
    },
  });
  if (!deployment) {
    return res.status(404).json({
      success: false,
      message: "deployment not found",
      data: null,
    });
  }
  var container;
  try {
    container = docker.getContainer(deployment.containerId);
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: "Could not get deployment status",
      data: null,
    });
  }
  var containerStatus;
  try {
    containerStatus = (await container.inspect()).State.Status;
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { status: containerStatus },
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: "Could not fetch status",
      data: null,
    });
  }
  res.json({
    success: true,
    message: "deployment status fetched succesfully",
    data: {
      status: containerStatus,
    },
  });
};

const getContainerPortHandler = async (req, res) => {
  const { deploymentId } = req.params;

  if (!deploymentId) {
    return res.status(400).json({
      success: false,
      message: "deployment Id is required",
      data: null,
    });
  }

  const deployment = await prisma.deployment.findUnique({
    where: {
      id: deploymentId,
    },
    select: {
      containerId: true,
    },
  });

  if (!deployment) {
    return res.status(404).json({
      success: false,
      message: "deployment not found",
      data: null,
    });
  }

  const containerPort = deployment.containerPort;

  res.json({
    success: true,
    message: "Container Port fetched succesfully",
    data: {
      port: containerPort,
    },
  });
};

const incomingWebhookHandler = async (req, res) => {
  const { deploymentId } = req.params;
  const hook_id = req.headers["x-github-hook-id"];

  const deployment = await prisma.deployment.findUnique({
    where: {
      id: deploymentId,
    },
  });

  if (!deployment) {
    return res.status(404).json({
      success: false,
      message: "Deployment not found",
      data: null,
    });
  }

  if (deployment.webhookId !== hook_id) {
    return res.status(400).json({
      success: false,
      message: "Invalid webhook",
      data: null,
    });
  }

  if (req.body.hook_id !== undefined) {
    console.log("Hook Registration Successful for project", deploymentId);

    sendQueueMessage(
      "deploy",
      JSON.stringify({
        projectId: deploymentId,
        branchName: deployment.branchName,
        commitHash: "HEAD",
        userId: deployment.userId,
      }),
    );

    return res.json({
      success: true,
      message: "Hook Registration Successful",
      data: null,
    });
  }

  if (req.body.ref.split("/").pop() !== deployment.branchName) {
    return res.json({
      success: true,
      message: "Webhook received",
      data: null,
    });
  }

  if (!req.body.commits || req.body.commits.length === 0) {
    return res.json({
      success: true,
      message: "Webhook received",
      data: null,
    });
  }

  const changes = req.body.commits
    .map((commit) => commit.added.concat(commit.modified, commit.removed))
    .flat();
  if (
    !!deployment.baseDirectory &&
    !changes.some((change) =>
      change.startsWith(
        deployment.baseDirectory == "." ? "" : deployment.baseDirectory,
      ),
    )
  ) {
    console.log("Changes", changes);
    return res.json({
      success: true,
      message: "Webhook received",
      data: null,
    });
  }

  const branchName = req.body.ref.split("/").pop();

  console.log("Incoming Webhook for Project", deploymentId);
  console.log("Changes:", changes);
  console.log("Branch:", branchName);

  if (branchName != deployment.branchName) {
    return res.json({
      success: true,
      message: "Webhook received but not building",
      data: null,
    });
  }

  if (req.body.commits.length == 0) {
    return res.json({
      success: true,
      message: "Webhook received but not building",
      data: null,
    });
  }

  const latestCommit = req.body.commits
    .sort((a, b) => {
      return new Date(a.timestamp) - new Date(b.timestamp);
    })
    .at(-1).id;

  sendQueueMessage(
    "deploy",
    JSON.stringify({
      projectId: deploymentId,
      branchName: branchName,
      commitHash: latestCommit,
      userId: deployment.userId,
    }),
  );

  return res.json({
    success: true,
    message: "Webhook received",
    data: null,
  });
};

const proxyDeploymentHandler = async (req, res) => {
  const { deploymentId } = req.params;
  const deployment = await prisma.deployment.findUnique({
    where: {
      id: deploymentId,
    },
    select: {
      containerPort: true,
      status: true,
    },
  });

  if (!deployment) {
    return res.status(404).json({
      success: false,
      message: "Deployment not found",
    });
  }

  if (deployment.status !== "running") {
    return res.status(400).json({
      success: false,
      message: "Deployment not running",
    });
  }

  const containerPort = deployment.containerPort;
  if (!containerPort) {
    return res.status(404).json({
      success: false,
      message: "Container port not found",
    });
  }

  const proxy = createProxyMiddleware({
    target: `http://localhost:${containerPort}`,
    pathRewrite: (path, req) => {
      return req.originalUrl.replace(`/deployment/${deploymentId}/proxy`, "");
    },
    changeOrigin: true,
  });

  proxy(req, res);
};

const getContainerLogsHandler = async (req, res) => {
  const { deploymentId } = req.params;
  if (!deploymentId) {
    return res.status(400).json({
      success: false,
      message: "Deployment Id is required",
      data: null,
    });
  }

  const deployment = await prisma.deployment.findUnique({
    where: {
      id: deploymentId,
    },
    select: {
      containerId: true,
    },
  });

  if (!deployment) {
    return res.status(404).json({
      success: false,
      message: "Deployment not found",
      data: null,
    });
  }

  const container = docker.getContainer(deployment.containerId);
  if (!container) {
    return res.status(404).json({
      success: false,
      message: "Container not found",
      data: null,
    });
  }

  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Transfer-Encoding", "chunked");

  container.logs(
    {
      follow: true,
      stdout: true,
      stderr: true,
    },
    (err, stream) => {
      if (err) {
        return res
          .writeHead(500, {
            "Content-Type": "application/json",
          })
          .end(
            JSON.stringify({
              success: false,
              message: "Error fetching logs",
              data: null,
            }),
          );
      }
      stream.on("data", (data) => {
        res.write(data.toString());
      });
      stream.on("end", () => {
        res.end();
      });
    },
  );
};

export {
  newDeploymentHandler,
  getAllDeploymentsHandler,
  getDeploymentByIdHandler,
  startDeploymentHandler,
  stopDeploymentHandler,
  getDeploymentStatusHandler,
  getContainerPortHandler,
  incomingWebhookHandler,
  proxyDeploymentHandler,
  getContainerLogsHandler,
};
