import { Router } from "express";

import {
  activate,
  deactivate,
  getActive,
  getAll,
  getByRole,
  getInactive,
  getOne,
  remove,
  updateRole,
  updateStatus,
} from "../controllers/userController.js";

import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import {
  updateUserRoleSchema,
  updateUserStatusSchema,
  userIdSchema,
  userRoleParamSchema,
} from "../utils/userValidation.js";

const router = Router();

/*
 * Admin user management
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
  "/active",
  asyncHandler(getActive),
);

router.get(
  "/inactive",
  asyncHandler(getInactive),
);

router.get(
  "/role/:role",
  validate(
    userRoleParamSchema,
    "params",
  ),
  asyncHandler(getByRole),
);

router.get(
  "/:id",
  validate(
    userIdSchema,
    "params",
  ),
  asyncHandler(getOne),
);

router.patch(
  "/:id/role",
  validate(
    userIdSchema,
    "params",
  ),
  validate(
    updateUserRoleSchema,
  ),
  asyncHandler(updateRole),
);

router.patch(
  "/:id/status",
  validate(
    userIdSchema,
    "params",
  ),
  validate(
    updateUserStatusSchema,
  ),
  asyncHandler(updateStatus),
);

router.patch(
  "/:id/activate",
  validate(
    userIdSchema,
    "params",
  ),
  asyncHandler(activate),
);

router.patch(
  "/:id/deactivate",
  validate(
    userIdSchema,
    "params",
  ),
  asyncHandler(deactivate),
);

router.delete(
  "/:id",
  validate(
    userIdSchema,
    "params",
  ),
  asyncHandler(remove),
);

export default router;