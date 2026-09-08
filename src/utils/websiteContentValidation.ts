import { z } from "zod";

const websiteContentSectionSchema =
  z.enum([
    "homepage",
    "about",
    "organisation",
    "mission",
    "vision",
    "core_values",
    "founder_message",
    "contact",
  ]);

const titleSchema =
  z
    .string()
    .trim()
    .max(
      250,
      "Title must not exceed 250 characters.",
    )
    .optional();

const contentSchema =
  z
    .string()
    .trim()
    .min(
      1,
      "Content is required.",
    )
    .max(
      50000,
      "Content must not exceed 50,000 characters.",
    );

const metadataSchema =
  z
    .record(
      z.string(),
      z.unknown(),
    )
    .optional();

export const createWebsiteContentSchema =
  z.object({
    section:
      websiteContentSectionSchema,

    title:
      titleSchema,

    content:
      contentSchema,

    metadata:
      metadataSchema,

    isPublished:
      z.boolean().optional(),
  });

export const updateWebsiteContentSchema =
  z.object({
    title:
      titleSchema,

    content:
      contentSchema.optional(),

    metadata:
      metadataSchema,

    isPublished:
      z.boolean().optional(),
  });

export const updateWebsiteContentStatusSchema =
  z.object({
    isPublished:
      z.boolean(),
  });

export const websiteContentSectionParamSchema =
  z.object({
    section:
      websiteContentSectionSchema,
  });