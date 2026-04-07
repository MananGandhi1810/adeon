import { PrismaClient } from "@prisma/client";
import Docker from "dockerode";
import path from "path";
import { logContainerData } from "../utils/container-logs.js";
import { sendMessage } from "../utils/socket-service.js";
import sendEmail from "../utils/email.js";

const docker = new Docker();
const prisma = new PrismaClient();

const ghRepoRegex =
  /https?:\/\/(www\.)?github.com\/(?<owner>[\w.-]+)\/(?<name>[\w.-]+)/;

const buildContainer = async ({ projectId, branchName, commitHash }) => {
  console.log(`Received build request for ${projectId}`);
  const deployment = await prisma.deployment.update({
    where: { id: projectId },
    data: {
      status: "building",
    },
    include: {
      user: {
        select: {
          ghAccessToken: true,
          email: true,
        },
      },
      envSecrets: true,
    },
  });
  const url = `https://github.com/${deployment.githubUrl}`;
  const match = url.match(ghRepoRegex);
  if (!match || !(match.groups?.owner && match.groups?.name)) return null;
  const imageTag =
    `${match.groups.owner}/${match.groups.name}:latest`.toLowerCase();
  const buildStream = await docker.buildImage(
    {
      context: path.join(
        process.cwd(),
        "dockerfiles",
        deployment.framework.toLowerCase(),
      ),
      src: ["Dockerfile"],
    },
    {
      buildargs: {
        owner: match.groups.owner,
        name: match.groups.name,
        gh_token: deployment.user.ghAccessToken,
        branch: branchName,
        commitHash: commitHash,
        dir: deployment.baseDirectory,
      },
      t: imageTag,
    },
  );
  try {
    await new Promise((resolve, reject) => {
      buildStream.on("data", (data) => {
        if (!data.toString().trim()) return;
        try {
          const buildOutput = JSON.parse(data.toString());
          if (buildOutput.stream) {
            sendMessage(projectId, "build", data.toString());
          } else if (buildOutput.error) {
            console.error("Build Error:", buildOutput.error);
            reject(buildOutput.error);
          }
        } catch (e) {}
      });
      buildStream.on("end", () => resolve());
    });
  } catch (e) {
    sendEmail(
      deployment.user.email,
      "Build Failed",
      `<h1>Build failed for ${deployment.name}</h1>
Error:
${e}
            `,
    );
    await prisma.deployment.update({
      where: { id: projectId },
      data: {
        status: "error",
      },
    });
    return;
  }
  const envSecrets = deployment.envSecrets.map((v) => `${v.key}=${v.value}`);
  const container = await docker.createContainer({
    Image: imageTag,
    Tty: false,
    Env: envSecrets,
    HostConfig: {
      PortBindings: {
        "3000/tcp": [
          {
            HostPort: "0",
          },
        ],
      },
    },
  });
  await container.start();
  logContainerData(container.id, deployment.id);
  const containerInspection = await container.inspect();
  var containerStatus = containerInspection.State.Status;
  const containerDetails = {
    containerId: containerInspection.Id,
    imageName: imageTag,
    deployCommit: commitHash,
    lastDeploy: new Date(),
    status: containerStatus,
  };
  const prevContainer = docker.getContainer(deployment.containerId);
  if (prevContainer) {
    try {
      await prevContainer.kill();
    } catch (e) {}
    try {
      await prevContainer.remove();
    } catch (e) {}
  }
  await prisma.deployment.update({
    where: { id: projectId },
    data: containerDetails,
  });

  const containerPortBindings =
    containerInspection.NetworkSettings.Ports["3000/tcp"];
  const hostPort = containerPortBindings
    ? containerPortBindings[0].HostPort
    : null;

  await prisma.deployment.update({
    where: { id: projectId },
    data: {
      containerPort: hostPort,
    },
  });
};

export { buildContainer };
