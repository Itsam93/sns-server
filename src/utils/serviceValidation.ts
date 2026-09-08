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

const serviceDurationSchema =
  z
    .number()
    .int()
    .min(
      15,
      "Service duration must be at least 15 minutes.",
    );

const servicePriceSchema =
  z
    .number()
    .min(
      0,
      "Service price cannot be negative.",
    )
    .optional();

const serviceCurrencySchema =
  z
    .string()
    .trim()
    .toUpperCase()
    .length(
      3,
      "Currency must be a 3-letter currency code.",
    )
    .regex(
      /^[A-Z]{3}$/,
      "Currency must contain exactly 3 letters.",
    );

const serviceStatusSchema =
  z.boolean();

export const createServiceSchema =
  z.object({
    name:
      serviceNameSchema,

    slug:
      serviceSlugSchema,

    description:
      serviceDescriptionSchema,

    durationMinutes:
      serviceDurationSchema,

    price:
      servicePriceSchema,

    currency:
      serviceCurrencySchema
        .default("NGN"),

    isActive:
      serviceStatusSchema
        .optional(),
  });

export const updateServiceSchema =
  z.object({
    name:
      serviceNameSchema.optional(),

    slug:
      serviceSlugSchema.optional(),

    description:
      serviceDescriptionSchema
        .optional(),

    durationMinutes:
      serviceDurationSchema
        .optional(),

    price:
      servicePriceSchema,

    currency:
      serviceCurrencySchema
        .optional(),
  });

export const updateServiceStatusSchema =
  z.object({
    isActive:
      serviceStatusSchema,
  });

export const serviceIdSchema =
  z.object({
    id: z
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