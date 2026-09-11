import { Router } from "express";

import {
  login,
  logout,
  me,
  register,
} from "../controllers/authController.js";

import { requireAuth } from "../middleware/authMiddleware.js";

import {
  csrfTokenMiddleware,
  requireCsrfToken,
} from "../middleware/csrfMiddleware.js";

import {
  authRateLimiter,
} from "../middleware/rateLimitMiddleware.js";

import { validate } from "../middleware/validateMiddleware.js";

import {
  loginSchema,
  registerSchema,
} from "../utils/validation.js";

import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get(
  "/csrf",
  csrfTokenMiddleware,
  (_req, res) => {
    res.status(200).json({
      success: true,
      data: {
        csrfToken:
          res.locals.csrfToken,
      },
    });
  },
);

router.post(
  "/register",
  authRateLimiter,
  requireCsrfToken,
  validate(registerSchema),
  asyncHandler(register),
);

router.post(
  "/login",
  authRateLimiter,
  requireCsrfToken,
  validate(loginSchema),
  asyncHandler(login),
);

router.post(
  "/logout",
  requireAuth,
  requireCsrfToken,
  asyncHandler(logout),
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(me),
);

export default router;