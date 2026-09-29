import type {
  RequestHandler,
} from "express";
import mongoose from "mongoose";

import { Client } from "../models/Client.js";
import { User } from "../models/User.js";

import {
  AppError,
} from "../utils/appError.js";

import {
  verifyAccessToken,
} from "../utils/jwt.js";

const AUTH_ERROR = {
  success: false,
  code: "AUTHENTICATION_REQUIRED",
  message: "Authentication required.",
} as const;

const ADMIN_ERROR = {
  success: false,
  code: "FORBIDDEN",
  message: "Administrator access required.",
} as const;

function sendAuthError(
  res: Parameters<RequestHandler>[1],
  error: AppError,
): void {
  res.status(error.statusCode).json({
    success: false,
    code:
      error.code ??
      "AUTHENTICATION_REQUIRED",
    message: error.message,
  });
}

export const requireAuth: RequestHandler =
  async (req, res, next) => {
    try {
      const cookieName =
        process.env.COOKIE_NAME?.trim() ||
        "accessToken";

      const token =
        req.cookies?.[cookieName];

      if (
        typeof token !== "string" ||
        token.length === 0 ||
        token.length > 4096
      ) {
        res
          .status(401)
          .json(AUTH_ERROR);

        return;
      }

      const payload =
        verifyAccessToken(token);

      if (
        !mongoose.isValidObjectId(
          payload.userId,
        )
      ) {
        res
          .status(401)
          .json(AUTH_ERROR);

        return;
      }

      const user =
        await User.findOne({
          _id: payload.userId,
          isActive: true,
        })
          .select(
            "_id role passwordVersion",
          )
          .lean();

      if (!user) {
        res
          .status(401)
          .json(AUTH_ERROR);

        return;
      }

      if (
        user.role !==
        payload.role
      ) {
        res
          .status(401)
          .json(AUTH_ERROR);

        return;
      }

      if (
        user.passwordVersion !==
        payload.passwordVersion
      ) {
        throw new AppError(
          "Your session is no longer valid. Please sign in again.",
          401,
          "SESSION_INVALIDATED",
        );
      }

      if (user.role === "client") {
        const client =
          await Client.findOne({
            userId: user._id,
          })
            .select("_id")
            .lean();

        if (!client) {
          res
            .status(401)
            .json(AUTH_ERROR);

          return;
        }

        req.user = {
          userId:
            user._id.toString(),
          clientId:
            client._id.toString(),
          role: "client",
        };

        next();

        return;
      }

      if (user.role === "admin") {
        req.user = {
          userId:
            user._id.toString(),
          role: "admin",
        };

        next();

        return;
      }

      res
        .status(401)
        .json(AUTH_ERROR);
    } catch (error: unknown) {
      if (
        error instanceof AppError
      ) {
        sendAuthError(
          res,
          error,
        );

        return;
      }

      res
        .status(401)
        .json(AUTH_ERROR);
    }
  };

export const requireAdmin: RequestHandler =
  (req, res, next) => {
    if (
      !req.user ||
      req.user.role !== "admin"
    ) {
      res
        .status(403)
        .json(ADMIN_ERROR);

      return;
    }

    next();
  };