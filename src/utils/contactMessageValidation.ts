import { z } from "zod";

export const contactMessageStatusSchema = z.enum([
  "new",
  "read",
  "responded",
  "archived",
]);

export const contactMessageCategorySchema = z.enum([
  "general",
  "appointment",
  "counselling",
  "workshop",
  "partnership",
  "other",
]);

const fullNameSchema = z
  .string()
  .trim()
  .min(1, "Full name is required.")
  .max(
    200,
    "Full name must not exceed 200 characters.",
  );

const emailSchema = z
  .string()
  .trim()
  .email("Please provide a valid email address.")
  .max(
    320,
    "Email address must not exceed 320 characters.",
  );

const phoneSchema = z
  .string()
  .trim()
  .max(
    30,
    "Phone number must not exceed 30 characters.",
  )
  .optional();

const subjectSchema = z
  .string()
  .trim()
  .min(1, "Subject is required.")
  .max(
    250,
    "Subject must not exceed 250 characters.",
  );

const messageSchema = z
  .string()
  .trim()
  .min(1, "Message is required.")
  .max(
    10000,
    "Message must not exceed 10,000 characters.",
  );

const adminNoteSchema = z
  .string()
  .trim()
  .max(
    3000,
    "Admin note must not exceed 3,000 characters.",
  )
  .optional();

/*
 * Public contact message
 */

export const createContactMessageSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  phone: phoneSchema,
  subject: subjectSchema,
  message: messageSchema,
  category: contactMessageCategorySchema.optional(),
});

/*
 * Admin updates
 */

export const updateContactMessageSchema = z
  .object({
    adminNote: adminNoteSchema,
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message:
        "At least one contact message field must be provided.",
    },
  );

export const updateContactMessageStatusSchema =
  z.object({
    status: contactMessageStatusSchema,
    adminNote: adminNoteSchema,
  });

/*
 * Route parameters
 */

export const contactMessageIdSchema = z.object({
  id: z
    .string()
    .trim()
    .min(
      1,
      "Contact message ID is required.",
    ),
});

export const contactMessageStatusParamSchema =
  z.object({
    status: contactMessageStatusSchema,
  });

export const contactMessageCategoryParamSchema =
  z.object({
    category: contactMessageCategorySchema,
  });