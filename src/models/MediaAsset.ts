import mongoose, {
  Document,
  Schema,
} from "mongoose";

export type MediaAssetType =
  | "image"
  | "video"
  | "document"
  | "audio";

export type MediaAssetStatus =
  | "active"
  | "archived";

export interface IMediaAsset
  extends Document {
  name: string;

  originalName: string;

  type: MediaAssetType;

  mimeType: string;

  url: string;

  publicId?: string;

  size?: number;

  width?: number;

  height?: number;

  altText?: string;

  description?: string;

  folder?: string;

  status: MediaAssetStatus;

  uploadedBy: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const mediaAssetSchema =
  new Schema<IMediaAsset>(
    {
      name: {
        type: String,
        required: [
          true,
          "Media asset name is required.",
        ],
        trim: true,
        maxlength: 250,
      },

      originalName: {
        type: String,
        required: [
          true,
          "Original file name is required.",
        ],
        trim: true,
        maxlength: 500,
      },

      type: {
        type: String,
        enum: [
          "image",
          "video",
          "document",
          "audio",
        ],
        required: true,
        index: true,
      },

      mimeType: {
        type: String,
        required: [
          true,
          "MIME type is required.",
        ],
        trim: true,
        maxlength: 150,
      },

      url: {
        type: String,
        required: [
          true,
          "Media URL is required.",
        ],
        trim: true,
        maxlength: 2000,
      },

      publicId: {
        type: String,
        trim: true,
        maxlength: 500,
      },

      size: {
        type: Number,
        min: 0,
      },

      width: {
        type: Number,
        min: 1,
      },

      height: {
        type: Number,
        min: 1,
      },

      altText: {
        type: String,
        trim: true,
        maxlength: 500,
      },

      description: {
        type: String,
        trim: true,
        maxlength: 1000,
      },

      folder: {
        type: String,
        trim: true,
        maxlength: 250,
        index: true,
      },

      status: {
        type: String,
        enum: [
          "active",
          "archived",
        ],
        default: "active",
        required: true,
        index: true,
      },

      uploadedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: [
          true,
          "Uploader is required.",
        ],
        index: true,
      },
    },
    {
      timestamps: true,
    },
  );

mediaAssetSchema.index({
  status: 1,
  createdAt: -1,
});

mediaAssetSchema.index({
  type: 1,
  status: 1,
  createdAt: -1,
});

mediaAssetSchema.index({
  folder: 1,
  status: 1,
  createdAt: -1,
});

mediaAssetSchema.index({
  uploadedBy: 1,
  createdAt: -1,
});

export const MediaAsset =
  mongoose.model<IMediaAsset>(
    "MediaAsset",
    mediaAssetSchema,
  );