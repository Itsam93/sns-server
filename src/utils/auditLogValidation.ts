import { z } from "zod";

const auditActionSchema =
  z.enum([
    "create",
    "update",
    "delete",
    "archive",
    "restore",
    "activate",
    "deactivate",
    "approve",
    "reject",
    "cancel",
    "complete",
    "login",
    "logout",
    "status_change",
  ]);

const auditResourceSchema =
  z.enum([
    "user",
    "client",
    "appointment",
    "service",
    "availability",
    "availability_exception",
    "intake_form",
    "notification",
    "workshop",
    "workshop_request",
    "workshop_participant",
    "testimonial",
    "resource",
    "faq",
    "contact_message",
    "website_content",
    "media_asset",
  ]);

const auditChangeSchema =
  z.object({
    before: z.unknown().optional(),
    after: z.unknown().optional(),
  });

const auditChangesSchema =
  z.record(
    z.string().trim().min(1),
    auditChangeSchema,
  );

const auditMetadataSchema =
  z.record(
    z.string().trim().min(1),
    z.unknown(),
  );

const auditDescriptionSchema =
  z
    .string()
    .trim()
    .min(
      1,
      "Audit description is required.",
    )
    .max(
      1000,
      "Audit description must not exceed 1,000 characters.",
    );

const ipAddressSchema =
  z
    .string()
    .trim()
    .max(
      100,
      "IP address must not exceed 100 characters.",
    )
    .optional();

const userAgentSchema =
  z
    .string()
    .trim()
    .max(
      1000,
      "User agent must not exceed 1,000 characters.",
    )
    .optional();

export const createAuditLogSchema =
  z.object({
    action:
      auditActionSchema,

    resource:
      auditResourceSchema,

    resourceId:
      z
        .string()
        .trim()
        .min(
          1,
          "Resource ID cannot be empty.",
        )
        .optional(),

    description:
      auditDescriptionSchema,

    changes:
      auditChangesSchema.optional(),

    metadata:
      auditMetadataSchema.optional(),

    ipAddress:
      ipAddressSchema,

    userAgent:
      userAgentSchema,
  });

export const auditLogIdSchema =
  z.object({
    id: z
      .string()
      .trim()
      .min(
        1,
        "Audit log ID is required.",
      ),
  });

export const auditLogActionParamSchema =
  z.object({
    action:
      auditActionSchema,
  });

export const auditLogResourceParamSchema =
  z.object({
    resource:
      auditResourceSchema,
  });

export const auditLogActorParamSchema =
  z.object({
    actorId: z
      .string()
      .trim()
      .min(
        1,
        "Actor ID is required.",
      ),
  });

export const auditLogResourceIdParamSchema =
  z.object({
    resourceId: z
      .string()
      .trim()
      .min(
        1,
        "Resource ID is required.",
      ),
  });