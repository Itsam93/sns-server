import { Router } from "express";

import {
  getAll,
  getUnread,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
  remove,
} from "../controllers/notificationController.js";

import { requireAuth } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import {
  notificationIdSchema,
} from "../utils/notificationValidation.js";

const router = Router();

router.use(
  requireAuth,
);

router.get(
  "/",
  asyncHandler(getAll),
);

router.get(
  "/unread",
  asyncHandler(getUnread),
);

router.get(
  "/unread-count",
  asyncHandler(getUnreadCount),
);

router.patch(
  "/read-all",
  asyncHandler(markAllAsRead),
);

router.patch(
  "/:id/read",
  validate(
    notificationIdSchema,
    "params",
  ),
  asyncHandler(markAsRead),
);

router.delete(
  "/:id",
  validate(
    notificationIdSchema,
    "params",
  ),
  asyncHandler(remove),
);

export default router;