import { Router } from "express";

import {
  getSubscribers,
  subscribe,
} from "../controllers/newsletterController.js";

import {
  requireAuth,
  requireAdmin,
} from "../middleware/authMiddleware.js";

const router = Router();

router.post(
  "/subscribe",
  subscribe,
);

router.get(
  "/",
  requireAuth,
  requireAdmin,
  getSubscribers,
);

export default router;