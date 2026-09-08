import { Router } from "express";

import {
  create,
  getAll,
  getByStatus,
  getFeatured,
  getOne,
  getPublished,
  remove,
  update,
  updateFeatured,
  updateStatus,
} from "../controllers/testimonialController.js";

import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import {
  createTestimonialSchema,
  testimonialIdSchema,
  updateTestimonialFeaturedSchema,
  updateTestimonialSchema,
  updateTestimonialStatusSchema,
} from "../utils/testimonialValidation.js";

const router = Router();

/*
 * Public testimonial routes
 */

router.get(
  "/published",
  asyncHandler(getPublished),
);

router.get(
  "/featured",
  asyncHandler(getFeatured),
);

router.post(
  "/",
  validate(createTestimonialSchema),
  asyncHandler(create),
);

/*
 * Admin testimonial management
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
    testimonialIdSchema,
    "params",
  ),
  asyncHandler(getOne),
);

router.patch(
  "/:id",
  validate(
    testimonialIdSchema,
    "params",
  ),
  validate(
    updateTestimonialSchema,
  ),
  asyncHandler(update),
);

router.patch(
  "/:id/status",
  validate(
    testimonialIdSchema,
    "params",
  ),
  validate(
    updateTestimonialStatusSchema,
  ),
  asyncHandler(updateStatus),
);

router.patch(
  "/:id/featured",
  validate(
    testimonialIdSchema,
    "params",
  ),
  validate(
    updateTestimonialFeaturedSchema,
  ),
  asyncHandler(updateFeatured),
);

router.delete(
  "/:id",
  validate(
    testimonialIdSchema,
    "params",
  ),
  asyncHandler(remove),
);

export default router;