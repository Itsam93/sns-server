import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .email(
    "Please provide a valid email address.",
  )
  .max(
    254,
    "Email address is too long.",
  )
  .transform((value) =>
    value.toLowerCase(),
  );

const passwordSchema = z
  .string()
  .min(
    12,
    "Password must contain at least 12 characters.",
  )
  .max(
    128,
    "Password must not exceed 128 characters.",
  );

const nameSchema = z
  .string()
  .trim()
  .min(
    2,
    "Name must contain at least 2 characters.",
  )
  .max(
    50,
    "Name must not exceed 50 characters.",
  )
  .regex(
    /^[\p{L}\p{M}][\p{L}\p{M}'’ .-]*[\p{L}\p{M}]$/u,
    "Name contains invalid characters.",
  );

const phoneSchema = z
  .string()
  .trim()
  .max(
    30,
    "Phone number is too long.",
  )
  .regex(
    /^[0-9+().\-\s]+$/,
    "Phone number contains invalid characters.",
  )
  .optional();

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    firstName: nameSchema,
    lastName: nameSchema,
    phone: phoneSchema,
  })
  .strict();

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z
      .string()
      .min(
        1,
        "Password is required.",
      )
      .max(
        128,
        "Password must not exceed 128 characters.",
      ),
  })
  .strict();

export const forgotPasswordSchema =
  z
    .object({
      email: emailSchema,
    })
    .strict();

export const resetPasswordSchema =
  z
    .object({
      token: z
        .string()
        .trim()
        .min(
          1,
          "Password reset token is required.",
        )
        .max(
          256,
          "Password reset token is invalid.",
        ),

      password: passwordSchema,

      confirmPassword:
        passwordSchema,
    })
    .strict()
    .refine(
      (data) =>
        data.password ===
        data.confirmPassword,
      {
        message:
          "Passwords do not match.",
        path: [
          "confirmPassword",
        ],
      },
    );

export const changePasswordSchema =
  z
    .object({
      currentPassword: z
        .string()
        .min(
          1,
          "Current password is required.",
        )
        .max(
          128,
          "Current password must not exceed 128 characters.",
        ),

      newPassword:
        passwordSchema,

      confirmPassword:
        passwordSchema,
    })
    .strict()
    .refine(
      (data) =>
        data.newPassword ===
        data.confirmPassword,
      {
        message:
          "Passwords do not match.",
        path: [
          "confirmPassword",
        ],
      },
    );