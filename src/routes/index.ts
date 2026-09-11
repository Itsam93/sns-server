import { Router } from "express";

import authRoutes from "./authRoutes.js";
import clientRoutes from "./clientRoutes.js";
import userRoutes from "./userRoutes.js";
import dashboardRoutes from "./dashboardRoutes.js";
import appointmentRoutes from "./appointmentRoutes.js";
import availabilityRoutes from "./availabilityRoutes.js";
import availabilityExceptionRoutes from "./availabilityExceptionRoutes.js";
import slotRoutes from "./slotRoutes.js";
import intakeFormRoutes from "./intakeFormRoutes.js";
import notificationRoutes from "./notificationRoutes.js";
import serviceRoutes from "./serviceRoutes.js";
import workshopRoutes from "./workshopRoutes.js";
import workshopRequestRoutes from "./workshopRequestRoutes.js";
import workshopParticipantRoutes from "./workshopParticipantRoutes.js";
import testimonialRoutes from "./testimonialRoutes.js";
import resourceRoutes from "./resourceRoutes.js";
import faqRoutes from "./faqRoutes.js";
import contactMessageRoutes from "./contactMessageRoutes.js";
import websiteContentRoutes from "./websiteContentRoutes.js";
import mediaAssetRoutes from "./mediaAssetRoutes.js";
import auditLogRoutes from "./auditLogRoutes.js";
import settingsRoutes from "./settingsRoutes.js";
import broadcastRoutes from "./broadcastRoutes.js";

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
router.use("/services", serviceRoutes);
router.use("/workshops", workshopRoutes);
router.use(
  "/workshop-requests",
  workshopRequestRoutes,
);
router.use(
  "/workshop-participants",
  workshopParticipantRoutes,
);
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
router.use("/media-assets", mediaAssetRoutes);
router.use("/audit-logs", auditLogRoutes);
router.use("/settings", settingsRoutes);
router.use("/broadcasts", broadcastRoutes);

export default router;