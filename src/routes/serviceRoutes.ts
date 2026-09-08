import { Router } from "express";

import {
  activate,
  create,
  deactivate,
  getActive,
  getAll,
  getBySlug,
  getOne,
  remove,
  update,
  updateStatus,
} from "../controllers/serviceController.js";

import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import {
  createServiceSchema,
  serviceIdSchema,
  serviceSlugParamSchema,
  updateServiceSchema,
  updateServiceStatusSchema,
} from "../utils/serviceValidation.js";

const router = Router();

/*
 * Public service routes
 */

router.get(
  "/active",
  asyncHandler(getActive),
);

router.get(
  "/slug/:slug",
  validate(
    serviceSlugParamSchema,
    "params",
  ),
  asyncHandler(getBySlug),
);

/*
 * Admin service management
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
  "/:id",
  validate(
    serviceIdSchema,
    "params",
  ),
  asyncHandler(getOne),
);

router.post(
  "/",
  validate(
    createServiceSchema,
  ),
  asyncHandler(create),
);

router.patch(
  "/:id",
  validate(
    serviceIdSchema,
    "params",
  ),
  validate(
    updateServiceSchema,
  ),
  asyncHandler(update),
);

router.patch(
  "/:id/status",
  validate(
    serviceIdSchema,
    "params",
  ),
  validate(
    updateServiceStatusSchema,
  ),
  asyncHandler(updateStatus),
);

router.patch(
  "/:id/activate",
  validate(
    serviceIdSchema,
    "params",
  ),
  asyncHandler(activate),
);

router.patch(
  "/:id/deactivate",
  validate(
    serviceIdSchema,
    "params",
  ),
  asyncHandler(deactivate),
);

router.delete(
  "/:id",
  validate(
    serviceIdSchema,
    "params",
  ),
  asyncHandler(remove),
);

export default router;