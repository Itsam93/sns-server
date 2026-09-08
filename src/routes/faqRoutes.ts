import { Router } from "express";

import {
  create,
  getAll,
  getByCategory,
  getByStatus,
  getCategories,
  getFeatured,
  getOne,
  getPublished,
  remove,
  update,
  updateFeatured,
  updateOrder,
  updateStatus,
} from "../controllers/faqController.js";

import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import {
  createFAQSchema,
  faqIdSchema,
  updateFAQFeaturedSchema,
  updateFAQOrderSchema,
  updateFAQSchema,
  updateFAQStatusSchema,
} from "../utils/faqValidation.js";

const router = Router();

/*
 * Public FAQ routes
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
  "/categories",
  asyncHandler(getCategories),
);

router.get(
  "/category/:category",
  asyncHandler(getByCategory),
);

/*
 * Admin FAQ management
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
    faqIdSchema,
    "params",
  ),
  asyncHandler(getOne),
);

router.post(
  "/",
  validate(createFAQSchema),
  asyncHandler(create),
);

router.patch(
  "/:id",
  validate(
    faqIdSchema,
    "params",
  ),
  validate(updateFAQSchema),
  asyncHandler(update),
);

router.patch(
  "/:id/status",
  validate(
    faqIdSchema,
    "params",
  ),
  validate(
    updateFAQStatusSchema,
  ),
  asyncHandler(updateStatus),
);

router.patch(
  "/:id/featured",
  validate(
    faqIdSchema,
    "params",
  ),
  validate(
    updateFAQFeaturedSchema,
  ),
  asyncHandler(updateFeatured),
);

router.patch(
  "/:id/order",
  validate(
    faqIdSchema,
    "params",
  ),
  validate(
    updateFAQOrderSchema,
  ),
  asyncHandler(updateOrder),
);

router.delete(
  "/:id",
  validate(
    faqIdSchema,
    "params",
  ),
  asyncHandler(remove),
);

export default router;