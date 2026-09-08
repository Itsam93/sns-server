import type { RequestHandler } from "express";

import { Client } from "../models/Client.js";
import { User } from "../models/User.js";
import { verifyAccessToken } from "../utils/jwt.js";

export const requireAuth: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    const cookieName =
      process.env.COOKIE_NAME || "accessToken";

    const token = req.cookies[cookieName];

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });

      return;
    }

    const payload = verifyAccessToken(token);

    const user = await User.findOne({
      _id: payload.userId,
      isActive: true,
    }).select("_id role");

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });

      return;
    }

    if (
      user.role !== "client" &&
      user.role !== "admin"
    ) {
      res.status(403).json({
        success: false,
        message: "User role is not configured.",
      });

      return;
    }

    if (user.role === "client") {
      const client = await Client.findOne({
        userId: user._id,
      }).select("_id");

      if (!client) {
        res.status(403).json({
          success: false,
          message: "Client profile not found.",
        });

        return;
      }

      req.user = {
        userId: user._id.toString(),
        clientId: client._id.toString(),
        role: "client",
      };
    } else {
      req.user = {
        userId: user._id.toString(),
        role: "admin",
      };
    }

    next();
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid or expired authentication.",
    });
  }
};
