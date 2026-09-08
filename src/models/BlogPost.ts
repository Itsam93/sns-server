import mongoose, { Document, Schema } from "mongoose";

export type BlogStatus =
  | "draft"
  | "scheduled"
  | "published"
  | "archived";

export interface IBlogPost extends Document {
  title: string;
  slug: string;

  excerpt?: string;
  content: string;

  featuredImage?: string;

  author?: string;
  category?: string;
  tags: string[];

  seoTitle?: string;
  seoDescription?: string;

  status: BlogStatus;
  publishedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const blogPostSchema = new Schema<IBlogPost>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    excerpt: {
      type: String,
      trim: true,
    },

    content: {
      type: String,
      required: true,
    },

    featuredImage: {
      type: String,
      trim: true,
    },

    author: {
      type: String,
      trim: true,
    },

    category: {
      type: String,
      trim: true,
    },

    tags: {
      type: [String],
      default: [],
    },

    seoTitle: {
      type: String,
      trim: true,
    },

    seoDescription: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: ["draft", "scheduled", "published", "archived"],
      default: "draft",
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

export const BlogPost = mongoose.model<IBlogPost>(
  "BlogPost",
  blogPostSchema,
);