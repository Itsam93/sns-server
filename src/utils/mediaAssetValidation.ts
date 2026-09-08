import { z } from "zod";

const mediaAssetTypeSchema =
  z.enum([
    "image",
    "video",
    "document",
    "audio",
  ]);

const mediaAssetStatusSchema =
  z.enum([
    "active",
    "archived",
  ]);

const nameSchema =
  z
    .string()
    .trim()
    .min(
      1,
      "Media asset name is required.",
    )
    .max(
      250,
      "Media asset name must not exceed 250 characters.",
    );

const originalNameSchema =
  z
    .string()
    .trim()
    .min(
      1,
      "Original file name is required.",
    )
    .max(
      500,
      "Original file name must not exceed 500 characters.",
    );

const mimeTypeSchema =
  z
    .string()
    .trim()
    .min(
      1,
      "MIME type is required.",
    )
    .max(
      150,
      "MIME type must not exceed 150 characters.",
    );

const urlSchema =
  z
    .string()
    .trim()
    .url(
      "Media URL must be a valid URL.",
    )
    .max(
      2000,
      "Media URL must not exceed 2,000 characters.",
    );

const publicIdSchema =
  z
    .string()
    .trim()
    .max(
      500,
      "Public ID must not exceed 500 characters.",
    )
    .optional();

const sizeSchema =
  z
    .number()
    .int()
    .min(
      0,
      "File size cannot be negative.",
    )
    .optional();

const dimensionSchema =
  z
    .number()
    .int()
    .min(
      1,
      "Image dimensions must be at least 1.",
    )
    .optional();

const altTextSchema =
  z
    .string()
    .trim()
    .max(
      500,
      "Alt text must not exceed 500 characters.",
    )
    .optional();

const descriptionSchema =
  z
    .string()
    .trim()
    .max(
      1000,
      "Description must not exceed 1,000 characters.",
    )
    .optional();

const folderSchema =
  z
    .string()
    .trim()
    .max(
      250,
      "Folder must not exceed 250 characters.",
    )
    .optional();

/*
 * Media asset creation
 */

export const createMediaAssetSchema =
  z
    .object({
      name:
        nameSchema,

      originalName:
        originalNameSchema,

      type:
        mediaAssetTypeSchema,

      mimeType:
        mimeTypeSchema,

      url:
        urlSchema,

      publicId:
        publicIdSchema,

      size:
        sizeSchema,

      width:
        dimensionSchema,

      height:
        dimensionSchema,

      altText:
        altTextSchema,

      description:
        descriptionSchema,

      folder:
        folderSchema,

      status:
        mediaAssetStatusSchema
          .optional(),
    })
    .refine(
      ({
        type,
        width,
        height,
      }) =>
        type !== "image" ||
        (width !== undefined &&
          height !== undefined),
      {
        message:
          "Width and height are required for image assets.",
        path: ["width"],
      },
    );

/*
 * Media asset updates
 */

export const updateMediaAssetSchema =
  z.object({
    name:
      nameSchema.optional(),

    altText:
      altTextSchema,

    description:
      descriptionSchema,

    folder:
      folderSchema,
  });

/*
 * Media asset status
 */

export const updateMediaAssetStatusSchema =
  z.object({
    status:
      mediaAssetStatusSchema,
  });

/*
 * Media asset filters
 */

export const mediaAssetTypeParamSchema =
  z.object({
    type:
      mediaAssetTypeSchema,
  });

export const mediaAssetStatusParamSchema =
  z.object({
    status:
      mediaAssetStatusSchema,
  });

export const mediaAssetFolderParamSchema =
  z.object({
    folder:
      z
        .string()
        .trim()
        .min(
          1,
          "Media folder is required.",
        )
        .max(250),
  });

/*
 * Media asset ID
 */

export const mediaAssetIdSchema =
  z.object({
    id: z
      .string()
      .trim()
      .min(
        1,
        "Media asset ID is required.",
      ),
  });