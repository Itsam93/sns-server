import { Router } from "express";

import {
  create,
  getAll,
  getByClient,
  getMine,
  getOne,
  updateMine,
} from "../controllers/intakeFormController.js";

import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";

import {
  createIntakeFormSchema,
  intakeFormIdSchema,
  updateIntakeFormSchema,
} from "../utils/intakeFormValidation.js";

import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(requireAuth);

/*
 * Client intake form
 */

router.get(
  "/me",
  requireRole("client"),
  asyncHandler(getMine),
);

router.post(
  "/me",
  requireRole("client"),
  validate(createIntakeFormSchema),
  asyncHandler(create),
);

router.patch(
  "/me",
  requireRole("client"),
  validate(updateIntakeFormSchema),
  asyncHandler(updateMine),
);

/*
 * Admin intake form access
 */

router.get(
  "/",
  requireRole("admin"),
  asyncHandler(getAll),
);

router.get(
  "/client/:clientId",
  requireRole("admin"),
  asyncHandler(getByClient),
);

router.get(
  "/:id",
  requireRole("admin"),
  validate(
    intakeFormIdSchema,
    "params",
  ),
  asyncHandler(getOne),
);

export default router;