import { Router } from "express";

import {
  calculateDiscount,
  calculatePrice,
  cancel,
  complete,
  create,
  getActive,
  getAll,
  getCapacity,
  getBySlug,
  getOne,
  getPricingOption,
  getPublished,
  publish,
  releaseCapacity,
  remove,
  reserveCapacity,
  start,
  update,
  updateStatus,
} from "../controllers/programmeController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createProgrammeSchema,
  programmeIdSchema,
  programmeSlugParamSchema,
  updateProgrammeSchema,
  updateProgrammeStatusSchema,
} from "../utils/programmeValidation.js";

const router = Router();

router.get(
  "/published",
  asyncHandler(getPublished),
);

router.get(
  "/active",
  asyncHandler(getActive),
);

router.get(
  "/slug/:slug",
  validate(
    programmeSlugParamSchema,
    "params",
  ),
  asyncHandler(getBySlug),
);

router.get(
  "/:id/capacity",
  validate(
    programmeIdSchema,
    "params",
  ),
  asyncHandler(getCapacity),
);

router.post(
  "/:id/pricing",
  validate(
    programmeIdSchema,
    "params",
  ),
  asyncHandler(getPricingOption),
);

router.post(
  "/:id/price",
  validate(
    programmeIdSchema,
    "params",
  ),
  asyncHandler(calculatePrice),
);

router.post(
  "/:id/discount",
  validate(
    programmeIdSchema,
    "params",
  ),
  asyncHandler(calculateDiscount),
);

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
    programmeIdSchema,
    "params",
  ),
  asyncHandler(getOne),
);

router.post(
  "/",
  validate(
    createProgrammeSchema,
  ),
  asyncHandler(create),
);

router.patch(
  "/:id",
  validate(
    programmeIdSchema,
    "params",
  ),
  validate(
    updateProgrammeSchema,
  ),
  asyncHandler(update),
);

router.patch(
  "/:id/status",
  validate(
    programmeIdSchema,
    "params",
  ),
  validate(
    updateProgrammeStatusSchema,
  ),
  asyncHandler(updateStatus),
);

router.patch(
  "/:id/publish",
  validate(
    programmeIdSchema,
    "params",
  ),
  asyncHandler(publish),
);

router.patch(
  "/:id/start",
  validate(
    programmeIdSchema,
    "params",
  ),
  asyncHandler(start),
);

router.patch(
  "/:id/complete",
  validate(
    programmeIdSchema,
    "params",
  ),
  asyncHandler(complete),
);

router.patch(
  "/:id/cancel",
  validate(
    programmeIdSchema,
    "params",
  ),
  asyncHandler(cancel),
);

router.post(
  "/:id/reserve-capacity",
  validate(
    programmeIdSchema,
    "params",
  ),
  asyncHandler(reserveCapacity),
);

router.post(
  "/:id/release-capacity",
  validate(
    programmeIdSchema,
    "params",
  ),
  asyncHandler(releaseCapacity),
);

router.delete(
  "/:id",
  validate(
    programmeIdSchema,
    "params",
  ),
  asyncHandler(remove),
);

export default router;