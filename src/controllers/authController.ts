import type { Request, Response } from "express";

import {
  getAuthenticatedUser,
  loginUser,
  registerClient,
} from "../services/authService.js";

import { AppError } from "../utils/appError.js";

const COOKIE_NAME =
  process.env.COOKIE_NAME?.trim() ||
  "accessToken";

const clientUrl =
  process.env.CLIENT_URL?.trim() || "";

const isCrossSiteDeployment =
  clientUrl.startsWith("https://");

const accessTokenMaxAge =
  Number(
    process.env.JWT_ACCESS_COOKIE_MAX_AGE_MS,
  ) || 15 * 60 * 1000;

const cookieOptions = {
  httpOnly: true,
  secure: isCrossSiteDeployment,
  sameSite: isCrossSiteDeployment
    ? ("none" as const)
    : ("lax" as const),
  path: "/",
  maxAge: accessTokenMaxAge,
};

const clearCookieOptions = {
  httpOnly: true,
  secure: isCrossSiteDeployment,
  sameSite: isCrossSiteDeployment
    ? ("none" as const)
    : ("lax" as const),
  path: "/",
};

function sanitizeUser(
  user: {
    email: string;
    password?: string;
    role: "client" | "admin";
    isEmailVerified: boolean;
    isActive: boolean;
    lastLoginAt?: Date;
    createdAt: Date;
    updatedAt: Date;
  },
) {
  const {
    password: _password,
    ...safeUser
  } = user;

  return safeUser;
}

export async function register(
  req: Request,
  res: Response,
) {
  const {
    email,
    password,
    firstName,
    lastName,
    phone,
  } = req.body;

  const result = await registerClient({
    email,
    password,
    firstName,
    lastName,
    phone,
  });

  res.status(201).json({
    success: true,
    message:
      "Account created successfully.",
    data: {
      user: sanitizeUser(
        result.user.toObject(),
      ),
      client: result.client,
    },
  });
}

export async function login(
  req: Request,
  res: Response,
) {
  const {
    email,
    password,
  } = req.body;

  const result = await loginUser({
    email,
    password,
  });

  res.cookie(
    COOKIE_NAME,
    result.accessToken,
    cookieOptions,
  );

  res.json({
    success: true,
    message: "Login successful.",
    data: {
      user: sanitizeUser(
        result.user.toObject(),
      ),
    },
  });
}

export async function me(
  req: Request,
  res: Response,
) {
  if (!req.user) {
    throw new AppError(
      "Authentication required.",
      401,
    );
  }

  const user =
    await getAuthenticatedUser(
      req.user.userId,
    );

  res.json({
    success: true,
    data: {
      user: sanitizeUser(
        user.toObject(),
      ),
    },
  });
}

export async function logout(
  _req: Request,
  res: Response,
) {
  res.clearCookie(
    COOKIE_NAME,
    clearCookieOptions,
  );

  res.json({
    success: true,
    message: "Logout successful.",
  });
}
