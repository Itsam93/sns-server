import type { RequestHandler } from "express";

import type { UserRole } from "../models/User.js";
import { AppError } from "../utils/appError.js";

export function requireRole(
  ...allowedRoles: UserRole[]
): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(
        new AppError(
          "Authentication required.",
          401,
        ),
      );
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(
        new AppError(
          "You do not have permission to perform this action.",
          403,
        ),
      );
      return;
    }

    next();
  };
}