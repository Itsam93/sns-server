import { z } from "zod";

export const registerSchema = z.object({
  email: z
    .string()
    .email("Please provide a valid email address.")
    .transform((value) => value.toLowerCase().trim()),

  password: z
    .string()
    .min(8, "Password must contain at least 8 characters."),

  firstName: z
    .string()
    .min(2, "First name is required.")
    .max(50)
    .trim(),

  lastName: z
    .string()
    .min(2, "Last name is required.")
    .max(50)
    .trim(),

  phone: z
    .string()
    .max(30)
    .trim()
    .optional(),
});

export const loginSchema = z.object({
  email: z
    .string()
    .email("Please provide a valid email address.")
    .transform((value) => value.toLowerCase().trim()),

  password: z
    .string()
    .min(1, "Password is required."),
});