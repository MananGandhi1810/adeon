import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import {
  getAccessToken,
  getUserDetails,
  getUserEmails,
  getUserRepositories,
} from "../utils/github-api.js";

const prisma = new PrismaClient();
const jwtSecret = process.env.JWT_SECRET;

const githubCallbackHandler = async (req, res) => {
  const { code } = req.query;
  const accessTokenResponse = await getAccessToken(code);
  if (accessTokenResponse.status >= 400) {
    return res.status(accessTokenResponse.status).json({
      success: false,
      messsage: "Could not login",
      data: accessTokenResponse.data,
    });
  }
  const accessToken = accessTokenResponse.data.access_token;
  console.log("Access token:", accessToken);
  const userDataPromise = getUserDetails(accessToken);
  const userEmailPromise = getUserEmails(accessToken);
  const [userDataResponse, userEmailResponse] = await Promise.all([
    userDataPromise,
    userEmailPromise,
  ]);
  console.log(
    "User data response status:",
    userDataResponse.status,
    "data:",
    userDataResponse.data,
  );
  console.log(
    "User email response status:",
    userEmailResponse.status,
    "data:",
    userEmailResponse.data,
  );
  if (userDataResponse.status >= 400 || userEmailResponse.status >= 400) {
    return res.status(500).json({
      success: false,
      messsage: "An error occurred when trying to get details",
      data: {
        userDataStatus: userDataResponse.status,
        userEmailStatus: userEmailResponse.status,
        userDataError: userDataResponse.data,
        userEmailError: userEmailResponse.data,
      },
    });
  }
  const userData = {
    name: userDataResponse.data.name ?? userDataResponse.data.login,
    ghUsername: userDataResponse.data.login,
    avatarUrl: userDataResponse.data.avatar_url,
    ghId: userDataResponse.data.id,
    ghAccessToken: accessToken,
  };
  const userEmail = userEmailResponse.data.find((email) => email.primary);
  if (!userEmail) {
    return res.status(400).json({
      success: false,
      message: "No Email ID",
      data: null,
    });
  }
  userData.email = userEmail.email;
  const user = await prisma.user.upsert({
    where: {
      email: userData.email,
    },
    update: {
      ghUsername: userData.ghUsername,
      ghId: userData.ghId,
      email: userData.email,
      ghAccessToken: userData.ghAccessToken,
    },
    create: userData,
  });
  const requestToken = jwt.sign(
    { email: user.email, name: user.name, id: user.id, scope: "request" },
    jwtSecret,
    { expiresIn: 5 * 60 },
  );
  res.redirect(
    `${process.env.FRONTEND_URL}/token?requestToken=${requestToken}`,
  );
};

const accessTokenHandler = async (req, res) => {
  const { authorization } = req.headers;
  if (!authorization) {
    return res.status(403).json({
      success: false,
      message: "Authorization header is missing",
      data: null,
    });
  }
  const token = authorization.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authorization bearer token is missing",
      data: null,
    });
  }
  var tokenData = {};
  try {
    tokenData = jwt.verify(token, jwtSecret);
  } catch (e) {
    console.log(e);

    return res.status(500).json({
      success: false,
      message: "An error occurred",
      data: null,
    });
  }
  if (!tokenData || tokenData.scope != "request") {
    return res.status(403).json({
      success: false,
      message: "Invalid token",
      data: null,
    });
  }
  const user = await prisma.user.findUnique({
    where: {
      email: tokenData.email,
    },
  });
  if (!user) {
    return res.status(403).json({
      success: false,
      message: "Could not verify user",
      data: null,
    });
  }
  const accessToken = jwt.sign(
    { email: user.email, name: user.name, id: user.id, scope: "access" },
    jwtSecret,
  );
  res.json({
    success: true,
    message: "Token generated successfully",
    data: {
      accessToken,
    },
  });
};

const userHandler = (req, res) => {
  const user = req.user;
  user.ghAccessToken = undefined;
  res.json({
    success: true,
    message: "User details fetched succesfully",
    data: {
      user,
    },
  });
};

const getUserRepositoriesHandler = async (req, res) => {
  const repositories = await getUserRepositories(req.user.ghAccessToken);
  const userRepos = repositories.filter(
    (repo) => repo.name.split("/")[0] === req.user.ghUsername,
  );
  res.json({
    success: true,
    message: "Fetched repositories succesfully",
    data: { repositories: userRepos },
  });
};

export {
  githubCallbackHandler,
  accessTokenHandler,
  userHandler,
  getUserRepositoriesHandler,
};
