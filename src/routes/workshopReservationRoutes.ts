
import { Router } from "express";

import {
  getMyWorkshopReservationByPaymentController,
  getMyWorkshopReservationByWorkshopController,
  getMyWorkshopReservationsController,
} from "../controllers/workshopReservationController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  workshopRegistrationPaymentIdSchema,
  workshopRegistrationWorkshopIdSchema,
} from "../utils/workshopRegistrationValidation.js";

const router = Router();

router.use(requireAuth);

router.get(
  "/mine",
  asyncHandler(getMyWorkshopReservationsController),
);

router.get(
  "/mine/workshop/:workshopId",
  validate(workshopRegistrationWorkshopIdSchema, "params"),
  asyncHandler(getMyWorkshopReservationByWorkshopController),
);

router.get(
  "/mine/payment/:paymentId",
  validate(workshopRegistrationPaymentIdSchema, "params"),
  asyncHandler(getMyWorkshopReservationByPaymentController),
);

export default router;