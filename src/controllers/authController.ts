import type {
  Request,
  Response,
} from "express";

import {
  changePassword,
  getAuthenticatedUser,
  loginUser,
  registerClient,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
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
    process.env
      .JWT_ACCESS_COOKIE_MAX_AGE_MS,
  ) ||
  15 * 60 * 1000;

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

  const result =
    await registerClient({
      email,
      password,
      firstName,
      lastName,
      phone,
    });

  res.status(201).json({
    success: true,
    message:
      "Account created successfully. Please check your email to verify your account.",
    data: {
      user: sanitizeUser(
        result.user.toObject(),
      ),
      client:
        result.client,
    },
  });
}

export async function verifyEmailAddress(
  req: Request,
  res: Response,
) {
  const token =
    typeof req.query.token ===
    "string"
      ? req.query.token
      : "";

  if (!token) {
    throw new AppError(
      "Verification token is required.",
      400,
    );
  }

  const result =
    await verifyEmail(token);

  res.json({
    success: true,
    message:
      result.alreadyVerified
        ? "Email address is already verified."
        : "Email address verified successfully.",
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

  const result =
    await loginUser({
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
    message:
      "Login successful.",
    data: {
      user: sanitizeUser(
        result.user.toObject(),
      ),
    },
  });
}

export async function forgotPassword(
  req: Request,
  res: Response,
) {
  const { email } =
    req.body;

  await requestPasswordReset({
    email,
  });

  res.json({
    success: true,
    message:
      "If an account exists with that email address, a password reset link has been sent.",
  });
}

export async function resetPasswordController(
  req: Request,
  res: Response,
) {
  const {
    token,
    password,
    confirmPassword,
  } = req.body;

  await resetPassword({
    token,
    password,
    confirmPassword,
  });

  res.json({
    success: true,
    message:
      "Your password has been reset successfully. You can now sign in with your new password.",
  });
}

export async function changePasswordController(
  req: Request,
  res: Response,
) {
  if (!req.user) {
    throw new AppError(
      "Authentication required.",
      401,
    );
  }

  const {
    currentPassword,
    newPassword,
    confirmPassword,
  } = req.body;

  await changePassword(
    req.user.userId,
    {
      currentPassword,
      newPassword,
      confirmPassword,
    },
  );

  res.json({
    success: true,
    message:
      "Your password has been changed successfully.",
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
    message:
      "Logout successful.",
  });
}