import { z } from "zod";

const serviceNameSchema =
  z
    .string()
    .trim()
    .min(
      1,
      "Service name is required.",
    )
    .max(
      250,
      "Service name must not exceed 250 characters.",
    );

const serviceSlugSchema =
  z
    .string()
    .trim()
    .min(
      1,
      "Service slug is required.",
    )
    .max(
      250,
      "Service slug must not exceed 250 characters.",
    )
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Service slug must contain only lowercase letters, numbers, and hyphens.",
    );

const serviceDescriptionSchema =
  z
    .string()
    .trim()
    .min(
      1,
      "Service description is required.",
    )
    .max(
      5000,
      "Service description must not exceed 5,000 characters.",
    );

const serviceTypeSchema =
  z.enum([
    "single_session",
    "session_package",
  ]);

const serviceDurationSchema =
  z
    .number()
    .int()
    .min(
      15,
      "Service duration must be at least 15 minutes.",
    );

const serviceSessionCountSchema =
  z
    .number()
    .int()
    .min(
      1,
      "Session count must be at least 1.",
    );

const servicePriceSchema =
  z
    .number()
    .finite(
      "Service price must be a valid number.",
    )
    .positive(
      "Service price must be greater than zero.",
    );

const servicePricingSchema =
  z.object({
    NGN:
      servicePriceSchema,

    USD:
      servicePriceSchema,

    GBP:
      servicePriceSchema,
  });

const serviceStatusSchema =
  z.boolean();

export const createServiceSchema =
  z
    .object({
      name:
        serviceNameSchema,

      slug:
        serviceSlugSchema,

      description:
        serviceDescriptionSchema,

      type:
        serviceTypeSchema,

      durationMinutes:
        serviceDurationSchema,

      sessionCount:
        serviceSessionCountSchema
          .optional(),

      pricing:
        servicePricingSchema,

      isActive:
        serviceStatusSchema
          .optional(),
    })
    .superRefine(
      (
        data,
        context,
      ) => {
        if (
          data.type ===
            "session_package" &&
          data.sessionCount ===
            undefined
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode
                .custom,
            path: [
              "sessionCount",
            ],
            message:
              "Session count is required for a session package.",
          });
        }

        if (
          data.type ===
            "single_session" &&
          data.sessionCount !==
            undefined &&
          data.sessionCount !== 1
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode
                .custom,
            path: [
              "sessionCount",
            ],
            message:
              "A single-session service must have a session count of 1.",
          });
        }
      },
    );

export const updateServiceSchema =
  z
    .object({
      name:
        serviceNameSchema
          .optional(),

      slug:
        serviceSlugSchema
          .optional(),

      description:
        serviceDescriptionSchema
          .optional(),

      type:
        serviceTypeSchema
          .optional(),

      durationMinutes:
        serviceDurationSchema
          .optional(),

      sessionCount:
        serviceSessionCountSchema
          .optional(),

      pricing:
        servicePricingSchema
          .optional(),

      isActive:
        serviceStatusSchema
          .optional(),
    })
    .superRefine(
      (
        data,
        context,
      ) => {
        if (
          data.type ===
            "session_package" &&
          data.sessionCount ===
            undefined
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode
                .custom,
            path: [
              "sessionCount",
            ],
            message:
              "Session count is required when changing a service to a session package.",
          });
        }

        if (
          data.type ===
            "single_session" &&
          data.sessionCount !==
            undefined &&
          data.sessionCount !== 1
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode
                .custom,
            path: [
              "sessionCount",
            ],
            message:
              "A single-session service must have a session count of 1.",
          });
        }
      },
    );

export const updateServiceStatusSchema =
  z.object({
    isActive:
      serviceStatusSchema,
  });

export const serviceIdSchema =
  z.object({
    id:
      z
        .string()
        .trim()
        .min(
          1,
          "Service ID is required.",
        ),
  });

export const serviceSlugParamSchema =
  z.object({
    slug:
      serviceSlugSchema,
  });