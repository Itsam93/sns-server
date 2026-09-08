import type { Request, Response } from "express";
import {
  getAuthenticatedUser,
  loginUser,
  registerClient,
} from "../services/authService.js";
import { AppError } from "../utils/appError.js";

const COOKIE_NAME =
  process.env.COOKIE_NAME || "accessToken";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite:
    process.env.NODE_ENV === "production"
      ? ("none" as const)
      : ("lax" as const),
  maxAge: 15 * 60 * 1000,
};

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

  const { password: _, ...user } = result.user.toObject();

  res.status(201).json({
    success: true,
    message: "Account created successfully.",
    data: {
      user,
      client: result.client,
    },
  });
}

export async function login(
  req: Request,
  res: Response,
) {
  const { email, password } = req.body;

  const result = await loginUser({
    email,
    password,
  });

  res.cookie(
    COOKIE_NAME,
    result.accessToken,
    cookieOptions,
  );

  const { password: _, ...user } = result.user.toObject();

  res.json({
    success: true,
    message: "Login successful.",
    data: {
      user,
    },
  });
}

export async function me(
  req: Request,
  res: Response,
) {
  if (!req.user) {
    throw new AppError("Authentication required.", 401);
  }

  const user = await getAuthenticatedUser(req.user.userId);

  const { password: _, ...safeUser } = user.toObject();

  res.json({
    success: true,
    data: {
      user: safeUser,
    },
  });
}

export function logout(
  _req: Request,
  res: Response,
) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite:
      process.env.NODE_ENV === "production"
        ? ("none" as const)
        : ("lax" as const),
  });

  res.json({
    success: true,
    message: "Logout successful.",
  });
}