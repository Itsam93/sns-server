import { Router } from "express";

import {
  create,
  getAll,
  getByCategory,
  getByStatus,
  getOne,
  getUnreadCount,
  remove,
  update,
  updateStatus,
} from "../controllers/contactMessageController.js";

import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import {
  contactMessageCategoryParamSchema,
  contactMessageIdSchema,
  contactMessageStatusParamSchema,
  createContactMessageSchema,
  updateContactMessageSchema,
  updateContactMessageStatusSchema,
} from "../utils/contactMessageValidation.js";

const router = Router();

/*
 * Public contact message
 */

router.post(
  "/",
  validate(createContactMessageSchema),
  asyncHandler(create),
);

/*
 * Admin contact message management
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
  "/unread-count",
  asyncHandler(getUnreadCount),
);

router.get(
  "/status/:status",
  validate(
    contactMessageStatusParamSchema,
    "params",
  ),
  getByStatus,
);

router.get(
  "/category/:category",
  validate(
    contactMessageCategoryParamSchema,
    "params",
  ),
  getByCategory,
);

router.get(
  "/:id",
  validate(
    contactMessageIdSchema,
    "params",
  ),
  getOne,
);

router.patch(
  "/:id",
  validate(
    contactMessageIdSchema,
    "params",
  ),
  validate(updateContactMessageSchema),
  update,
);

router.patch(
  "/:id/status",
  validate(
    contactMessageIdSchema,
    "params",
  ),
  validate(updateContactMessageStatusSchema),
  updateStatus,
);

router.delete(
  "/:id",
  validate(
    contactMessageIdSchema,
    "params",
  ),
  remove,
);

export default router;