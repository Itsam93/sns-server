import { Router } from "express";

import {
  create,
  getActive,
  getAll,
  getOne,
  remove,
  update,
} from "../controllers/availabilityController.js";

import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";

import {
  createAvailabilitySchema,
  updateAvailabilitySchema,
} from "../utils/availabilityValidation.js";

import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(requireAuth);
router.use(requireRole("admin"));

router.get(
  "/",
  asyncHandler(getAll),
);

router.get(
  "/active",
  asyncHandler(getActive),
);

router.get(
  "/:id",
  asyncHandler(getOne),
);

router.post(
  "/",
  validate(createAvailabilitySchema),
  asyncHandler(create),
);

router.patch(
  "/:id",
  validate(updateAvailabilitySchema),
  asyncHandler(update),
);

router.delete(
  "/:id",
  asyncHandler(remove),
);

export default router;