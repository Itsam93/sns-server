import { Router } from "express";

import {
  create,
  getAll,
  getById,
  getRecipients,
} from "../controllers/broadcastController.js";

import {
  requireAuth,
} from "../middleware/authMiddleware.js";

import {
  requireRole,
} from "../middleware/roleMiddleware.js";

const router = Router();

router.use(
  requireAuth,
  requireRole("admin"),
);

router.get(
  "/",
  getAll,
);

router.post(
  "/",
  create,
);

router.get(
  "/:id",
  getById,
);

router.get(
  "/:id/recipients",
  getRecipients,
);

export default router;