import { z } from "zod";

const resourceTypeSchema = z.enum([
  "article",
  "video",
  "download",
]);

const resourceStatusSchema = z.enum([
  "draft",
  "published",
  "archived",
]);

const titleSchema = z
  .string()
  .trim()
  .min(
    1,
    "Resource title is required.",
  )
  .max(
    250,
    "Resource title must not exceed 250 characters.",
  );

const slugSchema = z
  .string()
  .trim()
  .min(
    1,
    "Resource slug is required.",
  )
  .max(
    250,
    "Resource slug must not exceed 250 characters.",
  )
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must contain only lowercase letters, numbers, and hyphens.",
  );

const excerptSchema = z
  .string()
  .trim()
  .max(
    500,
    "Excerpt must not exceed 500 characters.",
  )
  .optional();

const contentSchema = z
  .string()
  .trim()
  .max(
    50000,
    "Content must not exceed 50,000 characters.",
  )
  .optional();

const categorySchema = z
  .string()
  .trim()
  .max(
    100,
    "Category must not exceed 100 characters.",
  )
  .optional();

const imageSchema = z
  .string()
  .trim()
  .url(
    "Featured image must be a valid URL.",
  )
  .max(1000)
  .optional();

const resourceUrlSchema = z
  .string()
  .trim()
  .url(
    "Resource URL must be a valid URL.",
  )
  .max(1000)
  .optional();

/*
 * Create resource
 */

export const createResourceSchema =
  z
    .object({
      title:
        titleSchema,

      slug:
        slugSchema,

      type:
        resourceTypeSchema,

      excerpt:
        excerptSchema,

      content:
        contentSchema,

      category:
        categorySchema,

      featuredImage:
        imageSchema,

      resourceUrl:
        resourceUrlSchema,

      status:
        resourceStatusSchema.optional(),

      featured:
        z.boolean().optional(),
    })
    .refine(
      ({
        type,
        content,
      }) =>
        type !== "article" ||
        Boolean(content?.trim()),
      {
        message:
          "Article content is required.",
        path: ["content"],
      },
    )
    .refine(
      ({
        type,
        resourceUrl,
      }) =>
        (type !== "video" &&
          type !== "download") ||
        Boolean(
          resourceUrl?.trim(),
        ),
      {
        message:
          "Resource URL is required for videos and downloads.",
        path: [
          "resourceUrl",
        ],
      },
    )
    .refine(
      ({
        type,
        content,
      }) =>
        type === "article" ||
        !content?.trim(),
      {
        message:
          "Content is only supported for article resources.",
        path: ["content"],
      },
    );

/*
 * Update resource
 */

export const updateResourceSchema =
  z
    .object({
      title:
        titleSchema.optional(),

      slug:
        slugSchema.optional(),

      type:
        resourceTypeSchema.optional(),

      excerpt:
        excerptSchema,

      content:
        contentSchema,

      category:
        categorySchema,

      featuredImage:
        imageSchema,

      resourceUrl:
        resourceUrlSchema,

      featured:
        z.boolean().optional(),
    });

/*
 * Resource status
 */

export const updateResourceStatusSchema =
  z.object({
    status:
      resourceStatusSchema,
  });

/*
 * Featured status
 */

export const updateResourceFeaturedSchema =
  z.object({
    featured:
      z.boolean(),
  });

/*
 * Resource ID
 */

export const resourceIdSchema =
  z.object({
    id: z
      .string()
      .trim()
      .min(
        1,
        "Resource ID is required.",
      ),
  });

/*
 * Resource slug
 */

export const resourceSlugSchema =
  z.object({
    slug: z
      .string()
      .trim()
      .min(
        1,
        "Resource slug is required.",
      )
      .max(250)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Invalid resource slug.",
      ),
  });