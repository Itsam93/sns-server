import { Router } from "express";

import {
  create,
  getAll,
  getBySlug,
  getOne,
  getPublished,
  getUpcoming,
  remove,
  update,
  updateStatus,
} from "../controllers/workshopController.js";

import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import {
  createWorkshopSchema,
  updateWorkshopSchema,
  updateWorkshopStatusSchema,
  workshopIdSchema,
} from "../utils/workshopValidation.js";

const router = Router();

/*
 * Public workshop routes
 */

router.get(
  "/published",
  asyncHandler(getPublished),
);

router.get(
  "/upcoming",
  asyncHandler(getUpcoming),
);

router.get(
  "/slug/:slug",
  asyncHandler(getBySlug),
);

/*
 * Admin workshop routes
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
  "/:id",
  validate(
    workshopIdSchema,
    "params",
  ),
  asyncHandler(getOne),
);

router.post(
  "/",
  validate(createWorkshopSchema),
  asyncHandler(create),
);

router.patch(
  "/:id",
  validate(
    workshopIdSchema,
    "params",
  ),
  validate(updateWorkshopSchema),
  asyncHandler(update),
);

router.patch(
  "/:id/status",
  validate(
    workshopIdSchema,
    "params",
  ),
  validate(
    updateWorkshopStatusSchema,
  ),
  asyncHandler(updateStatus),
);

router.delete(
  "/:id",
  validate(
    workshopIdSchema,
    "params",
  ),
  asyncHandler(remove),
);

export default router;