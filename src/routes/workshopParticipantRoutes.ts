import { Router } from "express";

import {
  cancel,
  getAll,
  getCount,
  getOne,
  register,
  remove,
  updateStatus,
} from "../controllers/workshopParticipantController.js";

import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import {
  createWorkshopParticipantSchema,
  updateParticipantStatusSchema,
  workshopIdParamSchema,
  workshopParticipantIdSchema,
} from "../utils/workshopValidation.js";

const router = Router();

/*
 * Public participant registration
 */

router.post(
  "/workshops/:workshopId/register",
  validate(
    workshopIdParamSchema,
    "params",
  ),
  validate(
    createWorkshopParticipantSchema,
  ),
  asyncHandler(register),
);

/*
 * Admin participant management
 */

router.use(
  requireAuth,
  requireRole("admin"),
);

router.get(
  "/workshops/:workshopId",
  validate(
    workshopIdParamSchema,
    "params",
  ),
  asyncHandler(getAll),
);

router.get(
  "/workshops/:workshopId/count",
  validate(
    workshopIdParamSchema,
    "params",
  ),
  asyncHandler(getCount),
);

router.get(
  "/:id",
  validate(
    workshopParticipantIdSchema,
    "params",
  ),
  asyncHandler(getOne),
);

router.patch(
  "/:id/status",
  validate(
    workshopParticipantIdSchema,
    "params",
  ),
  validate(
    updateParticipantStatusSchema,
  ),
  asyncHandler(updateStatus),
);

router.patch(
  "/:id/cancel",
  validate(
    workshopParticipantIdSchema,
    "params",
  ),
  asyncHandler(cancel),
);

router.delete(
  "/:id",
  validate(
    workshopParticipantIdSchema,
    "params",
  ),
  asyncHandler(remove),
);

export default router;