import { Router } from "express";

import {
  cancelWorkshopRegistrationController,
  checkWorkshopRegistrationController,
  countWorkshopAttendeesController,
  countWorkshopRegistrationsController,
  getAdminWorkshopRegistrationController,
  getAdminWorkshopRegistrationsController,
  getMyWorkshopRegistrationByPaymentController,
  getMyWorkshopRegistrationController,
  getMyWorkshopRegistrationsController,
  getWorkshopRegistrationByPaymentController,
  getWorkshopRegistrationsByTicketController,
  getWorkshopRegistrationsForWorkshopController,
  markWorkshopRegistrationAttendedController,
  refundWorkshopRegistrationController,
} from "../controllers/workshopRegistrationController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  workshopRegistrationIdSchema,
  workshopRegistrationPaymentIdSchema,
  workshopRegistrationWorkshopIdSchema,
} from "../utils/workshopRegistrationValidation.js";

const router = Router();

router.use(requireAuth);

/*
 * Client routes
 */

router.get(
  "/mine",
  asyncHandler(
    getMyWorkshopRegistrationsController,
  ),
);

router.get(
  "/mine/workshop/:workshopId",
  validate(
    workshopRegistrationWorkshopIdSchema,
    "params",
  ),
  asyncHandler(
    getMyWorkshopRegistrationController,
  ),
);

router.get(
  "/mine/has-registration/:workshopId",
  validate(
    workshopRegistrationWorkshopIdSchema,
    "params",
  ),
  asyncHandler(
    checkWorkshopRegistrationController,
  ),
);

router.get(
  "/mine/payment/:paymentId",
  validate(
    workshopRegistrationPaymentIdSchema,
    "params",
  ),
  asyncHandler(
    getMyWorkshopRegistrationByPaymentController,
  ),
);

/*
 * Admin routes
 */

router.use(requireRole("admin"));

router.get(
  "/",
  asyncHandler(
    getAdminWorkshopRegistrationsController,
  ),
);

router.get(
  "/workshop/:workshopId",
  validate(
    workshopRegistrationWorkshopIdSchema,
    "params",
  ),
  asyncHandler(
    getWorkshopRegistrationsForWorkshopController,
  ),
);

router.get(
  "/workshop/:workshopId/ticket/:ticketCode",
  validate(
    workshopRegistrationWorkshopIdSchema,
    "params",
  ),
  asyncHandler(
    getWorkshopRegistrationsByTicketController,
  ),
);

router.get(
  "/workshop/:workshopId/count",
  validate(
    workshopRegistrationWorkshopIdSchema,
    "params",
  ),
  asyncHandler(
    countWorkshopRegistrationsController,
  ),
);

router.get(
  "/workshop/:workshopId/attendees/count",
  validate(
    workshopRegistrationWorkshopIdSchema,
    "params",
  ),
  asyncHandler(
    countWorkshopAttendeesController,
  ),
);

router.get(
  "/payment/:paymentId",
  validate(
    workshopRegistrationPaymentIdSchema,
    "params",
  ),
  asyncHandler(
    getWorkshopRegistrationByPaymentController,
  ),
);

router.get(
  "/:id",
  validate(
    workshopRegistrationIdSchema,
    "params",
  ),
  asyncHandler(
    getAdminWorkshopRegistrationController,
  ),
);

router.patch(
  "/:id/attended",
  validate(
    workshopRegistrationIdSchema,
    "params",
  ),
  asyncHandler(
    markWorkshopRegistrationAttendedController,
  ),
);

router.patch(
  "/:id/cancel",
  validate(
    workshopRegistrationIdSchema,
    "params",
  ),
  asyncHandler(
    cancelWorkshopRegistrationController,
  ),
);

router.patch(
  "/:id/refund",
  validate(
    workshopRegistrationIdSchema,
    "params",
  ),
  asyncHandler(
    refundWorkshopRegistrationController,
  ),
);

export default router;