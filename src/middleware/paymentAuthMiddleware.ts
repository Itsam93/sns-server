import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  requireAuth,
  requireAdmin,
} from "./authMiddleware.js";

import { AppError } from "../utils/appError.js";

export function requireServicePaymentAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  requireAuth(req, res, (error?: unknown) => {
    if (error) {
      next(error);
      return;
    }

    const userId =
      req.user?.userId;

    if (
      typeof userId !== "string" ||
      userId.trim().length === 0
    ) {
      next(
        new AppError(
          "Authenticated user's ID is missing.",
          401,
        ),
      );
      return;
    }

    next();
  });
}

export function requireAdminPaymentAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  requireAuth(req, res, (authError?: unknown) => {
    if (authError) {
      next(authError);
      return;
    }

    const userId =
      req.user?.userId;

    if (
      typeof userId !== "string" ||
      userId.trim().length === 0
    ) {
      next(
        new AppError(
          "Authenticated user's ID is missing.",
          401,
        ),
      );
      return;
    }

    requireAdmin(
      req,
      res,
      (adminError?: unknown) => {
        if (adminError) {
          next(adminError);
          return;
        }

        next();
      },
    );
  });
}