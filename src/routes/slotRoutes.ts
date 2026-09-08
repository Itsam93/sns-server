import { Router } from "express";

import {
  getForDate,
  getForDateRange,
} from "../controllers/slotController.js";

import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(requireAuth);
router.use(requireRole("client"));

router.get(
  "/",
  asyncHandler(getForDate),
);

router.get(
  "/range",
  asyncHandler(getForDateRange),
);

export default router;