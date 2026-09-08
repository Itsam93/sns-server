import { z } from "zod";

const nameSchema = z
  .string()
  .trim()
  .min(1, "Name is required.")
  .max(100, "Name must not exceed 100 characters.");

const phoneSchema = z
  .string()
  .trim()
  .max(30, "Phone number must not exceed 30 characters.")
  .optional();

const dateOfBirthSchema = z
  .coerce
  .date()
  .refine(
    (date) => !Number.isNaN(date.getTime()),
    {
      message: "Date of birth must be a valid date.",
    },
  )
  .refine(
    (date) => date < new Date(),
    {
      message: "Date of birth must be in the past.",
    },
  );

const contactMethodSchema = z.enum([
  "email",
  "phone",
]);

export const updateMyProfileSchema =
  z.object({
    firstName: nameSchema.optional(),

    lastName: nameSchema.optional(),

    phone: phoneSchema,

    dateOfBirth:
      dateOfBirthSchema.optional(),

    preferredContactMethod:
      contactMethodSchema.optional(),

    profileImage: z
      .string()
      .trim()
      .max(
        1000,
        "Profile image reference must not exceed 1000 characters.",
      )
      .optional(),
  });

export const adminUpdateClientSchema =
  z.object({
    firstName: nameSchema.optional(),

    lastName: nameSchema.optional(),

    phone: phoneSchema,

    dateOfBirth:
      dateOfBirthSchema.optional(),

    preferredContactMethod:
      contactMethodSchema.optional(),

    profileImage: z
      .string()
      .trim()
      .max(
        1000,
        "Profile image reference must not exceed 1000 characters.",
      )
      .optional(),
  });

export const updateClientStatusSchema =
  z.object({
    isActive: z.boolean(),
  });

export const clientIdSchema =
  z.object({
    id: z
      .string()
      .trim()
      .min(
        1,
        "Client ID is required.",
      ),
  });