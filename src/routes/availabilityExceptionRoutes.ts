import { Router } from "express";

import {
  create,
  getAll,
  getByDateRange,
  getOne,
  remove,
  update,
} from "../controllers/availabilityExceptionController.js";

import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";

import {
  createAvailabilityExceptionSchema,
  updateAvailabilityExceptionSchema,
} from "../utils/availabilityExceptionValidation.js";

import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(requireAuth);
router.use(requireRole("admin"));

router.get(
  "/",
  asyncHandler(getAll),
);

router.get(
  "/range",
  asyncHandler(getByDateRange),
);

router.get(
  "/:id",
  asyncHandler(getOne),
);

router.post(
  "/",
  validate(
    createAvailabilityExceptionSchema,
  ),
  asyncHandler(create),
);

router.patch(
  "/:id",
  validate(
    updateAvailabilityExceptionSchema,
  ),
  asyncHandler(update),
);

router.delete(
  "/:id",
  asyncHandler(remove),
);

export default router;