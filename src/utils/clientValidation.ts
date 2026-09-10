import { z } from "zod";

const nameSchema = z
  .string()
  .trim()
  .min(
    2,
    "Name must contain at least 2 characters.",
  )
  .max(
    100,
    "Name must not exceed 100 characters.",
  );

const phoneSchema = z
  .string()
  .trim()
  .max(
    30,
    "Phone number must not exceed 30 characters.",
  )
  .optional();

const dateOfBirthSchema = z
  .string()
  .trim()
  .date(
    "Date of birth must be a valid date.",
  )
  .refine(
    (value) => {
      const date = new Date(`${value}T00:00:00.000Z`);
      const today = new Date();

      return date < today;
    },
    {
      message:
        "Date of birth must be in the past.",
    },
  )
  .refine(
    (value) => {
      const date = new Date(`${value}T00:00:00.000Z`);
      const minimumDate = new Date();

      minimumDate.setFullYear(
        minimumDate.getFullYear() - 120,
      );

      return date >= minimumDate;
    },
    {
      message:
        "Date of birth is outside the permitted range.",
    },
  )
  .transform(
    (value) =>
      new Date(`${value}T00:00:00.000Z`),
  );

const contactMethodSchema = z.enum([
  "email",
  "phone",
]);

const profileImageSchema = z
  .string()
  .trim()
  .max(
    1000,
    "Profile image reference must not exceed 1000 characters.",
  )
  .refine(
    (value) => {
      if (!value) {
        return true;
      }

      try {
        const url = new URL(value);

        return (
          url.protocol === "https:" ||
          url.protocol === "http:"
        );
      } catch {
        return false;
      }
    },
    {
      message:
        "Profile image must be a valid URL.",
    },
  )
  .optional();

const clientProfileFields = {
  firstName: nameSchema.optional(),

  lastName: nameSchema.optional(),

  phone: phoneSchema,

  dateOfBirth:
    dateOfBirthSchema.optional(),

  preferredContactMethod:
    contactMethodSchema.optional(),

  profileImage:
    profileImageSchema,
};

export const updateMyProfileSchema =
  z
    .object(clientProfileFields)
    .strict();

export const adminUpdateClientSchema =
  z
    .object(clientProfileFields)
    .strict();

export const updateClientStatusSchema =
  z
    .object({
      isActive: z.boolean(),
    })
    .strict();

export const clientIdSchema =
  z
    .object({
      id: z
        .string()
        .trim()
        .regex(
          /^[0-9a-fA-F]{24}$/,
          "Invalid client ID.",
        ),
    })
    .strict();