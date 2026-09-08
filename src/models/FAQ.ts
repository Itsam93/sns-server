import mongoose, {
  Document,
  Schema,
} from "mongoose";

export type FAQStatus =
  | "draft"
  | "published"
  | "archived";

export interface IFAQ
  extends Document {
  question: string;
  answer: string;

  category?: string;

  displayOrder: number;

  featured: boolean;

  status: FAQStatus;

  publishedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const faqSchema =
  new Schema<IFAQ>(
    {
      question: {
        type: String,
        required: [
          true,
          "FAQ question is required.",
        ],
        trim: true,
        maxlength: 500,
      },

      answer: {
        type: String,
        required: [
          true,
          "FAQ answer is required.",
        ],
        trim: true,
        maxlength: 5000,
      },

      category: {
        type: String,
        trim: true,
        maxlength: 100,
      },

      displayOrder: {
        type: Number,
        default: 0,
        min: 0,
        required: true,
      },

      featured: {
        type: Boolean,
        default: false,
        index: true,
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

      publishedAt: {
        type: Date,
      },
    },
    {
      timestamps: true,
    },
  );

faqSchema.pre(
  "validate",
  function () {
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

faqSchema.index({
  status: 1,
  displayOrder: 1,
});

faqSchema.index({
  status: 1,
  featured: 1,
  displayOrder: 1,
});

faqSchema.index({
  category: 1,
  status: 1,
  displayOrder: 1,
});

export const FAQ =
  mongoose.model<IFAQ>(
    "FAQ",
    faqSchema,
  );