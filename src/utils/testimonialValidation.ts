import { z } from "zod";

const testimonialStatusSchema =
  z.enum([
    "pending",
    "approved",
    "published",
    "archived",
  ]);

const clientNameSchema = z
  .string()
  .trim()
  .min(
    1,
    "Client name is required.",
  )
  .max(
    200,
    "Client name must not exceed 200 characters.",
  );

const contentSchema = z
  .string()
  .trim()
  .min(
    1,
    "Testimonial content is required.",
  )
  .max(
    5000,
    "Testimonial content must not exceed 5000 characters.",
  );

const serviceNameSchema = z
  .string()
  .trim()
  .max(
    200,
    "Service name must not exceed 200 characters.",
  )
  .optional();

const ratingSchema = z
  .number()
  .int()
  .min(
    1,
    "Rating must be at least 1.",
  )
  .max(
    5,
    "Rating must not exceed 5.",
  )
  .optional();

/*
 * Public testimonial submission
 */

export const createTestimonialSchema =
  z.object({
    clientName:
      clientNameSchema,

    content:
      contentSchema,

    serviceName:
      serviceNameSchema,

    rating:
      ratingSchema,

    isAnonymous:
      z.boolean().optional(),
  });

/*
 * Admin testimonial update
 */

export const updateTestimonialSchema =
  z.object({
    clientName:
      clientNameSchema.optional(),

    content:
      contentSchema.optional(),

    serviceName:
      serviceNameSchema,

    rating:
      ratingSchema,

    isAnonymous:
      z.boolean().optional(),

    featured:
      z.boolean().optional(),
  });

/*
 * Admin status update
 */

export const updateTestimonialStatusSchema =
  z.object({
    status:
      testimonialStatusSchema,
  });

/*
 * Admin featured update
 */

export const updateTestimonialFeaturedSchema =
  z.object({
    featured:
      z.boolean(),
  });

/*
 * Testimonial ID
 */

export const testimonialIdSchema =
  z.object({
    id: z
      .string()
      .trim()
      .min(
        1,
        "Testimonial ID is required.",
      ),
  });