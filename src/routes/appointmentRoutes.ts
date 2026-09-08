import { Router } from "express";

import {
  accept,
  cancel,
  complete,
  create,
  eligibility,
  getAll,
  getMine,
  getOne,
  reject,
  reschedule,
  start,
} from "../controllers/appointmentController.js";

import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import {
  acceptAppointmentSchema,
  cancelAppointmentSchema,
  createAppointmentSchema,
  rejectAppointmentSchema,
  rescheduleAppointmentSchema,
} from "../utils/appointmentValidation.js";

const router = Router();

router.use(requireAuth);

/* Client */

router.get(
  "/eligibility",
  requireRole("client"),
  asyncHandler(eligibility),
);

router.post(
  "/",
  requireRole("client"),
  validate(createAppointmentSchema),
  asyncHandler(create),
);

router.get(
  "/me",
  requireRole("client"),
  asyncHandler(getMine),
);

/* Admin */

router.get(
  "/",
  requireRole("admin"),
  asyncHandler(getAll),
);

/* Shared */

router.get(
  "/:id",
  asyncHandler(getOne),
);

router.patch(
  "/:id/cancel",
  validate(cancelAppointmentSchema),
  asyncHandler(cancel),
);

/* Admin appointment actions */

router.patch(
  "/:id/accept",
  requireRole("admin"),
  validate(acceptAppointmentSchema),
  asyncHandler(accept),
);

router.patch(
  "/:id/reject",
  requireRole("admin"),
  validate(rejectAppointmentSchema),
  asyncHandler(reject),
);

router.patch(
  "/:id/reschedule",
  requireRole("admin"),
  validate(rescheduleAppointmentSchema),
  asyncHandler(reschedule),
);

router.patch(
  "/:id/start",
  requireRole("admin"),
  asyncHandler(start),
);

router.patch(
  "/:id/complete",
  requireRole("admin"),
  asyncHandler(complete),
);

export default router;