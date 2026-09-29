import { Router } from "express";

import {
  checkUsableServicePackageController,
  getAdminServicePackageController,
  getAdminServicePackagesController,
  getMyActiveServicePackageController,
  getMyServicePackageController,
  getMyServicePackagesController,
  getServicePackageForAppointmentController,
  getServicePackageUsageController,
} from "../controllers/servicePackageController.js";

import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import {
  servicePackageClientIdSchema,
  servicePackageIdSchema,
  servicePackageServiceIdSchema,
} from "../utils/servicePackageValidation.js";

const router = Router();

router.use(requireAuth);

router.get(
  "/mine",
  asyncHandler(
    getMyServicePackagesController,
  ),
);

router.get(
  "/mine/active/:serviceId",
  validate(
    servicePackageServiceIdSchema,
    "params",
  ),
  asyncHandler(
    getMyActiveServicePackageController,
  ),
);

router.get(
  "/mine/usable/:serviceId",
  validate(
    servicePackageServiceIdSchema,
    "params",
  ),
  asyncHandler(
    checkUsableServicePackageController,
  ),
);

router.get(
  "/mine/appointment/:appointmentId",
  validate(
    servicePackageIdSchema,
    "params",
  ),
  asyncHandler(
    getServicePackageForAppointmentController,
  ),
);

router.get(
  "/mine/:id/usage",
  validate(
    servicePackageIdSchema,
    "params",
  ),
  asyncHandler(
    getServicePackageUsageController,
  ),
);

router.get(
  "/mine/:id",
  validate(
    servicePackageIdSchema,
    "params",
  ),
  asyncHandler(
    getMyServicePackageController,
  ),
);

router.use(requireRole("admin"));

router.get(
  "/",
  asyncHandler(
    getAdminServicePackagesController,
  ),
);

router.get(
  "/client/:clientId",
  validate(
    servicePackageClientIdSchema,
    "params",
  ),
  asyncHandler(
    getAdminServicePackageController,
  ),
);

router.get(
  "/:id",
  validate(
    servicePackageIdSchema,
    "params",
  ),
  asyncHandler(
    getAdminServicePackageController,
  ),
);

export default router;