import { z } from "zod";

const emailAddressSchema =
  z
    .string()
    .trim()
    .email(
      "A valid email address is required.",
    )
    .max(
      320,
      "Email address must not exceed 320 characters.",
    );

const emailSubjectSchema =
  z
    .string()
    .trim()
    .min(
      1,
      "Email subject is required.",
    )
    .max(
      250,
      "Email subject must not exceed 250 characters.",
    );

const emailBodySchema =
  z
    .string()
    .trim()
    .min(
      1,
      "Email body is required.",
    )
    .max(
      100000,
      "Email body must not exceed 100,000 characters.",
    );

export const sendEmailSchema =
  z.object({
    to:
      emailAddressSchema,

    subject:
      emailSubjectSchema,

    text:
      emailBodySchema,

    html:
      emailBodySchema.optional(),
  });

export const sendTemplatedEmailSchema =
  z.object({
    to:
      emailAddressSchema,

    subject:
      emailSubjectSchema,

    template:
      z
        .string()
        .trim()
        .min(
          1,
          "Email template is required.",
        )
        .max(
          100,
          "Email template name must not exceed 100 characters.",
        ),

    variables:
      z
        .record(
          z.string(),
          z.unknown(),
        )
        .optional(),
  });