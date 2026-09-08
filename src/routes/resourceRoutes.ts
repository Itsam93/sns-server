import { Router } from "express";

import {
  create,
  getAll,
  getByCategory,
  getBySlug,
  getByStatus,
  getByType,
  getFeatured,
  getLatest,
  getOne,
  getPublished,
  remove,
  update,
  updateFeatured,
  updateStatus,
} from "../controllers/resourceController.js";

import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import {
  createResourceSchema,
  resourceIdSchema,
  resourceSlugSchema,
  updateResourceFeaturedSchema,
  updateResourceSchema,
  updateResourceStatusSchema,
} from "../utils/resourceValidation.js";

const router = Router();

/*
 * Public resource routes
 */

router.get(
  "/published",
  asyncHandler(getPublished),
);

router.get(
  "/featured",
  asyncHandler(getFeatured),
);

router.get(
  "/latest",
  asyncHandler(getLatest),
);

router.get(
  "/type/:type",
  asyncHandler(getByType),
);

router.get(
  "/category/:category",
  asyncHandler(getByCategory),
);

router.get(
  "/slug/:slug",
  validate(
    resourceSlugSchema,
    "params",
  ),
  asyncHandler(getBySlug),
);

/*
 * Admin resource management
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
    resourceIdSchema,
    "params",
  ),
  asyncHandler(getOne),
);

router.post(
  "/",
  validate(createResourceSchema),
  asyncHandler(create),
);

router.patch(
  "/:id",
  validate(
    resourceIdSchema,
    "params",
  ),
  validate(updateResourceSchema),
  asyncHandler(update),
);

router.patch(
  "/:id/status",
  validate(
    resourceIdSchema,
    "params",
  ),
  validate(
    updateResourceStatusSchema,
  ),
  asyncHandler(updateStatus),
);

router.patch(
  "/:id/featured",
  validate(
    resourceIdSchema,
    "params",
  ),
  validate(
    updateResourceFeaturedSchema,
  ),
  asyncHandler(updateFeatured),
);

router.delete(
  "/:id",
  validate(
    resourceIdSchema,
    "params",
  ),
  asyncHandler(remove),
);

export default router;