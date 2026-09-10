import { Router } from "express";

import {
  getAll,
  getMine,
  getOne,
  update,
  updateMine,
  updateStatus,
} from "../controllers/clientController.js";

import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import {
  requireCsrfToken,
} from "../middleware/csrfMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";

import {
  adminUpdateClientSchema,
  clientIdSchema,
  updateClientStatusSchema,
  updateMyProfileSchema,
} from "../utils/clientValidation.js";

import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(requireAuth);

/*
 * Client profile
 */

router.get(
  "/me",
  requireRole("client"),
  asyncHandler(getMine),
);

router.patch(
  "/me",
  requireRole("client"),
  requireCsrfToken,
  validate(updateMyProfileSchema),
  asyncHandler(updateMine),
);

/*
 * Admin client management
 */

router.get(
  "/",
  requireRole("admin"),
  asyncHandler(getAll),
);

router.get(
  "/:id",
  requireRole("admin"),
  validate(clientIdSchema, "params"),
  asyncHandler(getOne),
);

router.patch(
  "/:id",
  requireRole("admin"),
  requireCsrfToken,
  validate(clientIdSchema, "params"),
  validate(adminUpdateClientSchema),
  asyncHandler(update),
);

router.patch(
  "/:id/status",
  requireRole("admin"),
  requireCsrfToken,
  validate(clientIdSchema, "params"),
  validate(updateClientStatusSchema),
  asyncHandler(updateStatus),
);

export default router;