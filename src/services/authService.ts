import crypto from "node:crypto";
import mongoose from "mongoose";

import { Client } from "../models/Client.js";
import { User } from "../models/User.js";
import { AppError } from "../utils/appError.js";

import {
  comparePassword,
  hashPassword,
} from "../utils/password.js";

import { signAccessToken } from "../utils/jwt.js";

import {
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendWelcomeEmail,
} from "./emailService.js";

import {
  generateEmailToken,
} from "../utils/emailToken.js";

type RegisterInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
};

type LoginInput = {
  email: string;
  password: string;
};

type ForgotPasswordInput = {
  email: string;
};

type ResetPasswordInput = {
  token: string;
  password: string;
  confirmPassword: string;
};

type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const PASSWORD_RESET_EXPIRES_MS =
  60 * 60 * 1000;

function normalizeEmail(
  email: string,
): string {
  return email
    .trim()
    .toLowerCase();
}

function normalizeName(
  value: string,
): string {
  return value
    .trim()
    .replace(/\s+/g, " ");
}

function normalizePhone(
  phone?: string,
): string | undefined {
  const normalized =
    phone?.trim();

  return normalized || undefined;
}

function isDuplicateKeyError(
  error: unknown,
): error is { code: number } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as {
      code?: unknown;
    }).code === 11000
  );
}

function hashPasswordResetToken(
  token: string,
): string {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

function generatePasswordResetToken() {
  const token =
    crypto
      .randomBytes(32)
      .toString("hex");

  const tokenHash =
    hashPasswordResetToken(token);

  return {
    token,
    tokenHash,
  };
}

export async function registerClient(
  input: RegisterInput,
) {
  const email =
    normalizeEmail(input.email);

  const firstName =
    normalizeName(input.firstName);

  const lastName =
    normalizeName(input.lastName);

  const phone =
    normalizePhone(input.phone);

  const existingUser =
    await User.exists({
      email,
    });

  if (existingUser) {
    throw new AppError(
      "An account with this email already exists.",
      409,
    );
  }

  const hashedPassword =
    await hashPassword(
      input.password,
    );

  const {
    token: verificationToken,
    tokenHash:
      verificationTokenHash,
  } = generateEmailToken();

  const verificationExpiresAt =
    new Date(
      Date.now() +
        24 * 60 * 60 * 1000,
    );

  const session =
    await mongoose.startSession();

  try {
    let createdUser:
      | InstanceType<typeof User>
      | undefined;

    let createdClient:
      | InstanceType<typeof Client>
      | undefined;

    await session.withTransaction(
      async () => {
        try {
          const users =
            await User.create(
              [
                {
                  email,
                  password:
                    hashedPassword,
                  role: "client",
                  isEmailVerified: false,
                  emailVerificationTokenHash:
                    verificationTokenHash,
                  emailVerificationExpiresAt:
                    verificationExpiresAt,
                },
              ],
              { session },
            );

          const user =
            users[0];

          if (!user) {
            throw new AppError(
              "Unable to create account.",
              500,
            );
          }

          createdUser = user;

          const clients =
            await Client.create(
              [
                {
                  userId:
                    user._id,
                  firstName,
                  lastName,
                  phone,
                },
              ],
              { session },
            );

          const client =
            clients[0];

          if (!client) {
            throw new AppError(
              "Unable to create client profile.",
              500,
            );
          }

          createdClient =
            client;
        } catch (error) {
          if (
            isDuplicateKeyError(
              error,
            )
          ) {
            throw new AppError(
              "An account with this email already exists.",
              409,
            );
          }

          throw error;
        }
      },
    );

    if (
      !createdUser ||
      !createdClient
    ) {
      throw new AppError(
        "Unable to create account.",
        500,
      );
    }

    await sendVerificationEmail({
      email,
      firstName,
      verificationToken,
    });

    return {
      user: createdUser,
      client: createdClient,
    };
  } finally {
    await session.endSession();
  }
}

export async function verifyEmail(
  token: string,
) {
  const normalizedToken =
    token.trim();

  if (!normalizedToken) {
    throw new AppError(
      "Invalid verification link.",
      400,
    );
  }

  const tokenHash =
    crypto
      .createHash("sha256")
      .update(normalizedToken)
      .digest("hex");

  const user =
    await User.findOne({
      emailVerificationTokenHash:
        tokenHash,
      emailVerificationExpiresAt: {
        $gt: new Date(),
      },
    }).select(
      "+emailVerificationTokenHash +emailVerificationExpiresAt",
    );

  if (!user) {
    throw new AppError(
      "This verification link is invalid or has expired.",
      400,
    );
  }

  if (user.isEmailVerified) {
    return {
      alreadyVerified: true,
    };
  }

  user.isEmailVerified =
    true;

  user.emailVerifiedAt =
    new Date();

  user.emailVerificationTokenHash =
    undefined;

  user.emailVerificationExpiresAt =
    undefined;

  await user.save();

  const client =
    await Client.findOne({
      userId: user._id,
    });

  if (client) {
    await sendWelcomeEmail({
      email: user.email,
      firstName:
        client.firstName,
    });
  }

  return {
    alreadyVerified: false,
  };
}

export async function loginUser(
  input: LoginInput,
) {
  const email =
    normalizeEmail(input.email);

  const user =
    await User.findOne({
      email,
    }).select("+password");

  if (!user) {
    throw new AppError(
      "Invalid email or password.",
      401,
    );
  }

  if (!user.isActive) {
    throw new AppError(
      "Invalid email or password.",
      401,
    );
  }

  const passwordMatches =
    await comparePassword(
      input.password,
      user.password,
    );

  if (!passwordMatches) {
    throw new AppError(
      "Invalid email or password.",
      401,
    );
  }

  user.lastLoginAt =
    new Date();

  await user.save();

  const accessToken =
    signAccessToken({
      userId:
        user._id.toString(),
      role: user.role,
    });

  return {
    user,
    accessToken,
  };
}

export async function requestPasswordReset(
  input: ForgotPasswordInput,
) {
  const email =
    normalizeEmail(input.email);

  const user =
    await User.findOne({
      email,
      isActive: true,
    });

  if (!user) {
    return;
  }

  const {
    token,
    tokenHash,
  } =
    generatePasswordResetToken();

  user.passwordResetTokenHash =
    tokenHash;

  user.passwordResetExpiresAt =
    new Date(
      Date.now() +
        PASSWORD_RESET_EXPIRES_MS,
    );

  await user.save();

  let firstName:
    | string
    | undefined;

  if (user.role === "client") {
    const client =
      await Client.findOne({
        userId: user._id,
      }).select(
        "firstName",
      );

    firstName =
      client?.firstName;
  }

  const delivery =
    await sendPasswordResetEmail({
      email: user.email,
      firstName,
      resetToken: token,
    });

  if (!delivery.accepted) {
    user.passwordResetTokenHash =
      undefined;

    user.passwordResetExpiresAt =
      undefined;

    await user.save();

    console.error(
      "[Auth] Password reset email could not be delivered.",
    );
  }
}

export async function resetPassword(
  input: ResetPasswordInput,
) {
  const normalizedToken =
    input.token.trim();

  if (!normalizedToken) {
    throw new AppError(
      "Invalid password reset link.",
      400,
    );
  }

  const tokenHash =
    hashPasswordResetToken(
      normalizedToken,
    );

  const user =
    await User.findOne({
      passwordResetTokenHash:
        tokenHash,
      passwordResetExpiresAt: {
        $gt: new Date(),
      },
      isActive: true,
    }).select(
      "+passwordResetTokenHash +passwordResetExpiresAt",
    );

  if (!user) {
    throw new AppError(
      "This password reset link is invalid or has expired.",
      400,
    );
  }

  if (
    input.password !==
    input.confirmPassword
  ) {
    throw new AppError(
      "Passwords do not match.",
      400,
    );
  }

  const hashedPassword =
    await hashPassword(
      input.password,
    );

  user.password =
    hashedPassword;

  user.passwordResetTokenHash =
    undefined;

  user.passwordResetExpiresAt =
    undefined;

  await user.save();

  return {
    reset: true,
  };
}

export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
) {
  if (
    !mongoose.isValidObjectId(
      userId,
    )
  ) {
    throw new AppError(
      "Authentication required.",
      401,
    );
  }

  const user =
    await User.findOne({
      _id: userId,
      isActive: true,
    }).select(
      "+password +passwordResetTokenHash +passwordResetExpiresAt",
    );

  if (!user) {
    throw new AppError(
      "Authentication required.",
      401,
    );
  }

  const currentPasswordMatches =
    await comparePassword(
      input.currentPassword,
      user.password,
    );

  if (!currentPasswordMatches) {
    throw new AppError(
      "Current password is incorrect.",
      400,
    );
  }

  if (
    input.newPassword !==
    input.confirmPassword
  ) {
    throw new AppError(
      "Passwords do not match.",
      400,
    );
  }

  const newPasswordMatchesCurrent =
    await comparePassword(
      input.newPassword,
      user.password,
    );

  if (newPasswordMatchesCurrent) {
    throw new AppError(
      "New password must be different from your current password.",
      400,
    );
  }

  user.password =
    await hashPassword(
      input.newPassword,
    );

  user.passwordResetTokenHash =
    undefined;

  user.passwordResetExpiresAt =
    undefined;

  await user.save();

  return {
    changed: true,
  };
}

export async function getAuthenticatedUser(
  userId: string,
) {
  if (
    !mongoose.isValidObjectId(
      userId,
    )
  ) {
    throw new AppError(
      "Authentication required.",
      401,
    );
  }

  const user =
    await User.findOne({
      _id: userId,
      isActive: true,
    });

  if (!user) {
    throw new AppError(
      "Authentication required.",
      401,
    );
  }

  return user;
}