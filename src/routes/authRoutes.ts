import { Router } from "express";

import {
  changePasswordController,
  forgotPassword,
  login,
  logout,
  me,
  register,
  resetPasswordController,
  verifyEmailAddress,
} from "../controllers/authController.js";

import {
  requireAuth,
} from "../middleware/authMiddleware.js";

import {
  csrfTokenMiddleware,
  requireCsrfToken,
} from "../middleware/csrfMiddleware.js";

import {
  authRateLimiter,
  passwordResetRateLimiter,
} from "../middleware/rateLimitMiddleware.js";

import {
  validate,
} from "../middleware/validateMiddleware.js";

import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "../utils/validation.js";

import {
  asyncHandler,
} from "../utils/asyncHandler.js";

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

router.get(
  "/verify-email",
  asyncHandler(
    verifyEmailAddress,
  ),
);

router.post(
  "/login",
  authRateLimiter,
  requireCsrfToken,
  validate(loginSchema),
  asyncHandler(login),
);

router.post(
  "/forgot-password",
  passwordResetRateLimiter,
  requireCsrfToken,
  validate(
    forgotPasswordSchema,
  ),
  asyncHandler(
    forgotPassword,
  ),
);

router.post(
  "/reset-password",
  passwordResetRateLimiter,
  requireCsrfToken,
  validate(
    resetPasswordSchema,
  ),
  asyncHandler(
    resetPasswordController,
  ),
);

router.post(
  "/change-password",
  requireAuth,
  passwordResetRateLimiter,
  requireCsrfToken,
  validate(
    changePasswordSchema,
  ),
  asyncHandler(
    changePasswordController,
  ),
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