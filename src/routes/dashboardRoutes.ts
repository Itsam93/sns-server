import { Router } from "express";

import {
  getAdmin,
  getClient,
} from "../controllers/dashboardController.js";

import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import {
  dashboardDateRangeSchema,
} from "../utils/dashboardValidation.js";

const router = Router();

router.use(
  requireAuth,
);

router.get(
  "/admin",
  requireRole("admin"),
  validate(
    dashboardDateRangeSchema,
    "query",
  ),
  asyncHandler(getAdmin),
);

router.get(
  "/client",
  requireRole("client"),
  asyncHandler(getClient),
);

export default router;