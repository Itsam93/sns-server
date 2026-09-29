import { Router } from "express";

import {
  createRefund,
  getAdminPayments,
  getAdminRefund,
  getMyPayments,
  getMyRefunds,
  getPayment,
  getPaymentRefunds,
  getPaymentRefundTotals,
  getRefund,
  initializePayment,
  refreshRefund,
  verifyPayment,
} from "../controllers/paymentController.js";

import {
  handleKoraWebhook,
} from "../controllers/koraWebhookController.js";

import {
  requireAuth,
} from "../middleware/authMiddleware.js";

const router = Router();

router.post(
  "/webhooks/korapay",
  handleKoraWebhook,
);

router.use(requireAuth);

/*
 * Payments
 */

router.post(
  "/",
  initializePayment,
);

router.get(
  "/",
  getMyPayments,
);

router.get(
  "/admin",
  getAdminPayments,
);

/*
 * Refunds
 *
 * Explicit/static routes are registered before
 * dynamic parameter routes to prevent Express
 * from treating route names as references or IDs.
 */

router.post(
  "/refunds",
  createRefund,
);

router.get(
  "/refunds",
  getMyRefunds,
);

router.get(
  "/refunds/admin/:reference",
  getAdminRefund,
);

router.post(
  "/refunds/:refundId/refresh",
  refreshRefund,
);

router.get(
  "/refunds/:reference",
  getRefund,
);

/*
 * Payment-specific refunds
 */

router.get(
  "/:paymentId/refunds/totals",
  getPaymentRefundTotals,
);

router.get(
  "/:paymentId/refunds",
  getPaymentRefunds,
);

/*
 * Payment lookup and verification
 */

router.get(
  "/:reference",
  getPayment,
);

router.post(
  "/:reference/verify",
  verifyPayment,
);

export default router;