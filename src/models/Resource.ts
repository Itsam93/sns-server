import mongoose, {
  Document,
  Schema,
} from "mongoose";

export type ResourceType =
  | "article"
  | "video"
  | "download";

export type ResourceStatus =
  | "draft"
  | "published"
  | "archived";

export interface IResource
  extends Document {
  title: string;
  slug: string;

  type: ResourceType;

  excerpt?: string;
  content?: string;

  category?: string;

  featuredImage?: string;

  resourceUrl?: string;

  status: ResourceStatus;

  featured: boolean;

  publishedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const resourceSchema =
  new Schema<IResource>(
    {
      title: {
        type: String,
        required: [
          true,
          "Resource title is required.",
        ],
        trim: true,
        maxlength: 250,
      },

      slug: {
        type: String,
        required: [
          true,
          "Resource slug is required.",
        ],
        unique: true,
        lowercase: true,
        trim: true,
        maxlength: 250,
      },

      type: {
        type: String,
        enum: [
          "article",
          "video",
          "download",
        ],
        required: true,
      },

      excerpt: {
        type: String,
        trim: true,
        maxlength: 500,
      },

      content: {
        type: String,
        trim: true,
      },

      category: {
        type: String,
        trim: true,
        maxlength: 100,
      },

      featuredImage: {
        type: String,
        trim: true,
        maxlength: 1000,
      },

      resourceUrl: {
        type: String,
        trim: true,
        maxlength: 1000,
      },

      status: {
        type: String,
        enum: [
          "draft",
          "published",
          "archived",
        ],
        default: "draft",
        required: true,
        index: true,
      },

      featured: {
        type: Boolean,
        default: false,
        index: true,
      },

      publishedAt: {
        type: Date,
      },
    },
    {
      timestamps: true,
    },
  );

resourceSchema.pre(
  "validate",
  function () {
    if (
      this.type === "article" &&
      !this.content?.trim()
    ) {
      this.invalidate(
        "content",
        "Article content is required.",
      );
    }

    if (
      (this.type === "video" ||
        this.type === "download") &&
      !this.resourceUrl?.trim()
    ) {
      this.invalidate(
        "resourceUrl",
        "Resource URL is required for videos and downloads.",
      );
    }

    if (
      this.status === "published" &&
      !this.publishedAt
    ) {
      this.publishedAt =
        new Date();
    }

    if (
      this.status !== "published"
    ) {
      this.featured = false;
    }
  },
);

resourceSchema.index({
  status: 1,
  publishedAt: -1,
});

resourceSchema.index({
  status: 1,
  featured: 1,
  publishedAt: -1,
});

resourceSchema.index({
  type: 1,
  status: 1,
  publishedAt: -1,
});

resourceSchema.index({
  category: 1,
  status: 1,
  publishedAt: -1,
});

export const Resource =
  mongoose.model<IResource>(
    "Resource",
    resourceSchema,
  );