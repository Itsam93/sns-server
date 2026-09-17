import type {
  RequestHandler,
} from "express";
import mongoose from "mongoose";

import { Client } from "../models/Client.js";
import { User } from "../models/User.js";
import {
  verifyAccessToken,
} from "../utils/jwt.js";

const AUTH_ERROR = {
  success: false,
  message: "Authentication required.",
};

const ADMIN_ERROR = {
  success: false,
  message: "Administrator access required.",
};

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
          .select("_id role")
          .lean();

      if (!user) {
        res
          .status(401)
          .json(AUTH_ERROR);
        return;
      }

      if (user.role !== payload.role) {
        res
          .status(401)
          .json(AUTH_ERROR);
        return;
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
    } catch {
      res.status(401).json({
        success: false,
        message:
          "Invalid or expired authentication.",
      });
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