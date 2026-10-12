import mongoose, {
  Document,
  Schema,
} from "mongoose";

export type ResourceType =
  | "article"
  | "video"
  | "download"
  | "book";

export type ResourceStatus =
  | "draft"
  | "published"
  | "archived";

export type BookFormat =
  | "paperback"
  | "hardcover"
  | "ebook"
  | "audiobook";

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

  author?: string;
  bookFormat?: BookFormat;

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
          "book",
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
        maxlength: 50000,
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

      author: {
        type: String,
        trim: true,
        maxlength: 150,
      },

      bookFormat: {
        type: String,
        enum: [
          "paperback",
          "hardcover",
          "ebook",
          "audiobook",
        ],
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
      (
        this.type === "video" ||
        this.type === "download" ||
        this.type === "book"
      ) &&
      !this.resourceUrl?.trim()
    ) {
      this.invalidate(
        "resourceUrl",
        "Resource URL is required for videos, downloads, and books.",
      );
    }

    if (
      this.type === "book" &&
      !this.author?.trim()
    ) {
      this.invalidate(
        "author",
        "Book author is required.",
      );
    }

    if (
      this.type === "book" &&
      !this.bookFormat
    ) {
      this.invalidate(
        "bookFormat",
        "Book format is required.",
      );
    }

    if (
      this.type !== "book" &&
      (this.author || this.bookFormat)
    ) {
      this.invalidate(
        "author",
        "Author and book format are only supported for book resources.",
      );
    }

    if (
      this.type !== "article" &&
      this.content?.trim()
    ) {
      this.invalidate(
        "content",
        "Content is only supported for article resources.",
      );
    }

    if (
      this.status === "published" &&
      !this.publishedAt
    ) {
      this.publishedAt = new Date();
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
