import { z } from "zod";

const faqStatusSchema = z.enum([
  "draft",
  "published",
  "archived",
]);

const questionSchema = z
  .string()
  .trim()
  .min(
    1,
    "FAQ question is required.",
  )
  .max(
    500,
    "FAQ question must not exceed 500 characters.",
  );

const answerSchema = z
  .string()
  .trim()
  .min(
    1,
    "FAQ answer is required.",
  )
  .max(
    5000,
    "FAQ answer must not exceed 5000 characters.",
  );

const categorySchema = z
  .string()
  .trim()
  .max(
    100,
    "FAQ category must not exceed 100 characters.",
  )
  .optional();

const displayOrderSchema = z
  .number()
  .int()
  .min(
    0,
    "Display order cannot be negative.",
  );

const featuredSchema =
  z.boolean();

/*
 * Create FAQ
 */

export const createFAQSchema =
  z.object({
    question:
      questionSchema,

    answer:
      answerSchema,

    category:
      categorySchema,

    displayOrder:
      displayOrderSchema.optional(),

    featured:
      featuredSchema.optional(),

    status:
      faqStatusSchema.optional(),
  });

/*
 * Update FAQ
 */

export const updateFAQSchema =
  z.object({
    question:
      questionSchema.optional(),

    answer:
      answerSchema.optional(),

    category:
      categorySchema,

    displayOrder:
      displayOrderSchema.optional(),

    featured:
      featuredSchema.optional(),
  });

/*
 * FAQ status
 */

export const updateFAQStatusSchema =
  z.object({
    status:
      faqStatusSchema,
  });

/*
 * Featured status
 */

export const updateFAQFeaturedSchema =
  z.object({
    featured:
      featuredSchema,
  });

/*
 * Display order
 */

export const updateFAQOrderSchema =
  z.object({
    displayOrder:
      displayOrderSchema,
  });

/*
 * FAQ ID
 */

export const faqIdSchema =
  z.object({
    id: z
      .string()
      .trim()
      .min(
        1,
        "FAQ ID is required.",
      ),
  });