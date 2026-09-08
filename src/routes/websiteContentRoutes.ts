import { Router } from "express";

import {
  create,
  getAll,
  getOne,
  getPublished,
  getPublishedBySection,
  remove,
  update,
  updateStatus,
} from "../controllers/websiteContentController.js";

import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import {
  createWebsiteContentSchema,
  updateWebsiteContentSchema,
  updateWebsiteContentStatusSchema,
  websiteContentSectionParamSchema,
} from "../utils/websiteContentValidation.js";

const router = Router();

/*
 * Public website content routes
 */

router.get(
  "/published",
  asyncHandler(getPublished),
);

router.get(
  "/published/:section",
  validate(
    websiteContentSectionParamSchema,
    "params",
  ),
  asyncHandler(getPublishedBySection),
);

/*
 * Admin website content management
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
  "/:section",
  validate(
    websiteContentSectionParamSchema,
    "params",
  ),
  asyncHandler(getOne),
);

router.post(
  "/",
  validate(
    createWebsiteContentSchema,
  ),
  asyncHandler(create),
);

router.patch(
  "/:section",
  validate(
    websiteContentSectionParamSchema,
    "params",
  ),
  validate(
    updateWebsiteContentSchema,
  ),
  asyncHandler(update),
);

router.patch(
  "/:section/status",
  validate(
    websiteContentSectionParamSchema,
    "params",
  ),
  validate(
    updateWebsiteContentStatusSchema,
  ),
  asyncHandler(updateStatus),
);

router.delete(
  "/:section",
  validate(
    websiteContentSectionParamSchema,
    "params",
  ),
  asyncHandler(remove),
);

export default router;