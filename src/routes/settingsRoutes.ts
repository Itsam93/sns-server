import { Router } from "express";

import {
  get,
  update,
} from "../controllers/settingsController.js";

import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import {
  updateSettingsSchema,
} from "../utils/settingsValidation.js";

const router = Router();

router.use(
  requireAuth,
  requireRole("admin"),
);

router.get(
  "/",
  asyncHandler(get),
);

router.patch(
  "/",
  validate(updateSettingsSchema),
  asyncHandler(update),
);

export default router;