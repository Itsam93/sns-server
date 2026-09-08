import { Router } from "express";

import {
  create,
  getAll,
  getByStatus,
  getOne,
  remove,
  update,
} from "../controllers/workshopRequestController.js";

import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import {
  createWorkshopRequestSchema,
  updateWorkshopRequestStatusSchema,
  workshopRequestIdSchema,
} from "../utils/workshopValidation.js";

const router = Router();

/*
 * Public workshop request
 */

router.post(
  "/",
  validate(createWorkshopRequestSchema),
  asyncHandler(create),
);

/*
 * Admin workshop request management
 */

router.use(
  requireAuth,
  requireRole("admin"),
);

router.get(
  "/",
  asyncHandler(getAll),
);

router.get(
  "/status/:status",
  asyncHandler(getByStatus),
);

router.get(
  "/:id",
  validate(
    workshopRequestIdSchema,
    "params",
  ),
  asyncHandler(getOne),
);

router.patch(
  "/:id",
  validate(
    workshopRequestIdSchema,
    "params",
  ),
  validate(
    updateWorkshopRequestStatusSchema,
  ),
  asyncHandler(update),
);

router.delete(
  "/:id",
  validate(
    workshopRequestIdSchema,
    "params",
  ),
  asyncHandler(remove),
);

export default router;