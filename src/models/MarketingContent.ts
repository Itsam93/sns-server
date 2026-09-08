import mongoose, { Document, Schema } from "mongoose";

export type MarketingPlatform =
  | "instagram"
  | "facebook"
  | "linkedin"
  | "x"
  | "whatsapp"
  | "email";

export type MarketingStatus =
  | "draft"
  | "scheduled"
  | "published"
  | "archived";

export interface IMarketingContent extends Document {
  title: string;
  caption: string;

  platform: MarketingPlatform;

  mediaUrls: string[];

  hashtags: string[];

  callToAction?: string;

  scheduledAt?: Date;
  publishedAt?: Date;

  status: MarketingStatus;

  createdAt: Date;
  updatedAt: Date;
}

const marketingContentSchema =
  new Schema<IMarketingContent>(
    {
      title: {
        type: String,
        required: true,
        trim: true,
      },

      caption: {
        type: String,
        required: true,
        trim: true,
      },

      platform: {
        type: String,
        enum: [
          "instagram",
          "facebook",
          "linkedin",
          "x",
          "whatsapp",
          "email",
        ],
        required: true,
      },

      mediaUrls: {
        type: [String],
        default: [],
      },

      hashtags: {
        type: [String],
        default: [],
      },

      callToAction: {
        type: String,
        trim: true,
      },

      scheduledAt: {
        type: Date,
      },

      publishedAt: {
        type: Date,
      },

      status: {
        type: String,
        enum: [
          "draft",
          "scheduled",
          "published",
          "archived",
        ],
        default: "draft",
        index: true,
      },
    },
    {
      timestamps: true,
    },
  );

export const MarketingContent =
  mongoose.model<IMarketingContent>(
    "MarketingContent",
    marketingContentSchema,
  );