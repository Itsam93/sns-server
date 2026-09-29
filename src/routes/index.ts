import { Router } from "express";

import appointmentRoutes from "./appointmentRoutes.js";
import auditLogRoutes from "./auditLogRoutes.js";
import authRoutes from "./authRoutes.js";
import availabilityExceptionRoutes from "./availabilityExceptionRoutes.js";
import availabilityRoutes from "./availabilityRoutes.js";
import broadcastRoutes from "./broadcastRoutes.js";
import clientRoutes from "./clientRoutes.js";
import contactMessageRoutes from "./contactMessageRoutes.js";
import dashboardRoutes from "./dashboardRoutes.js";
import faqRoutes from "./faqRoutes.js";
import intakeFormRoutes from "./intakeFormRoutes.js";
import mediaAssetRoutes from "./mediaAssetRoutes.js";
import newsletterRoutes from "./newsletterRoutes.js";
import notificationRoutes from "./notificationRoutes.js";
import paymentRoutes from "./paymentRoutes.js";
import programmeRoutes from "./programmeRoutes.js";
import resourceRoutes from "./resourceRoutes.js";
import servicePackageRoutes from "./servicePackageRoutes.js";
import serviceRoutes from "./serviceRoutes.js";
import settingsRoutes from "./settingsRoutes.js";
import slotRoutes from "./slotRoutes.js";
import testimonialRoutes from "./testimonialRoutes.js";
import userRoutes from "./userRoutes.js";
import websiteContentRoutes from "./websiteContentRoutes.js";
import workshopParticipantRoutes from "./workshopParticipantRoutes.js";
import workshopRegistrationRoutes from "./workshopRegistrationRoutes.js";
import workshopRequestRoutes from "./workshopRequestRoutes.js";
import workshopRoutes from "./workshopRoutes.js";

const router = Router();

router.use("/auth", authRoutes);

router.use("/clients", clientRoutes);

router.use("/users", userRoutes);

router.use("/dashboard", dashboardRoutes);

router.use("/appointments", appointmentRoutes);

router.use("/availability", availabilityRoutes);

router.use(
  "/availability-exceptions",
  availabilityExceptionRoutes,
);

router.use("/slots", slotRoutes);

router.use("/intake-forms", intakeFormRoutes);

router.use("/notifications", notificationRoutes);

/*
 * Service catalogue
 */

router.use("/services", serviceRoutes);

router.use("/programmes", programmeRoutes);

router.use("/workshops", workshopRoutes);

/*
 * Client purchases and entitlements
 */

router.use(
  "/service-packages",
  servicePackageRoutes,
);

router.use(
  "/workshop-registrations",
  workshopRegistrationRoutes,
);

/*
 * Workshop administration
 */

router.use(
  "/workshop-requests",
  workshopRequestRoutes,
);

router.use(
  "/workshop-participants",
  workshopParticipantRoutes,
);

/*
 * Website content
 */

router.use("/testimonials", testimonialRoutes);

router.use("/resources", resourceRoutes);

router.use("/faqs", faqRoutes);

router.use(
  "/contact-messages",
  contactMessageRoutes,
);

router.use(
  "/website-content",
  websiteContentRoutes,
);

router.use(
  "/media-assets",
  mediaAssetRoutes,
);

/*
 * Administration
 */

router.use("/audit-logs", auditLogRoutes);

router.use("/settings", settingsRoutes);

router.use("/broadcasts", broadcastRoutes);

router.use("/newsletter", newsletterRoutes);

/*
 * Payments
 *
 * Includes:
 * - client payment endpoints
 * - Kora webhook endpoint
 */

router.use("/payments", paymentRoutes);

export default router;