import { Router } from "express";

import {
  getAll,
  getByAction,
  getByActor,
  getByResource,
  getByResourceId,
  getOne,
  remove,
} from "../controllers/auditLogController.js";

import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import {
  auditLogActionParamSchema,
  auditLogActorParamSchema,
  auditLogIdSchema,
  auditLogResourceIdParamSchema,
  auditLogResourceParamSchema,
} from "../utils/auditLogValidation.js";

const router = Router();

/*
 * Admin audit log access
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
  "/action/:action",
  validate(
    auditLogActionParamSchema,
    "params",
  ),
  asyncHandler(getByAction),
);

router.get(
  "/resource/:resource",
  validate(
    auditLogResourceParamSchema,
    "params",
  ),
  asyncHandler(getByResource),
);

router.get(
  "/actor/:actorId",
  validate(
    auditLogActorParamSchema,
    "params",
  ),
  asyncHandler(getByActor),
);

router.get(
  "/resource-id/:resourceId",
  validate(
    auditLogResourceIdParamSchema,
    "params",
  ),
  asyncHandler(getByResourceId),
);

router.get(
  "/:id",
  validate(
    auditLogIdSchema,
    "params",
  ),
  asyncHandler(getOne),
);

router.delete(
  "/:id",
  validate(
    auditLogIdSchema,
    "params",
  ),
  asyncHandler(remove),
);

export default router;