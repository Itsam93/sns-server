import mongoose, {
  Document,
  Schema,
} from "mongoose";

export type TestimonialStatus =
  | "pending"
  | "approved"
  | "published"
  | "archived";

export interface ITestimonial
  extends Document {
  clientName: string;
  content: string;

  serviceName?: string;

  rating?: number;

  status: TestimonialStatus;

  isAnonymous: boolean;

  featured: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const testimonialSchema =
  new Schema<ITestimonial>(
    {
      clientName: {
        type: String,
        required: [
          true,
          "Client name is required.",
        ],
        trim: true,
        maxlength: 200,
      },

      content: {
        type: String,
        required: [
          true,
          "Testimonial content is required.",
        ],
        trim: true,
        maxlength: 5000,
      },

      serviceName: {
        type: String,
        trim: true,
        maxlength: 200,
      },

      rating: {
        type: Number,
        min: 1,
        max: 5,
      },

      status: {
        type: String,
        enum: [
          "pending",
          "approved",
          "published",
          "archived",
        ],
        default: "pending",
        required: true,
        index: true,
      },

      isAnonymous: {
        type: Boolean,
        default: false,
      },

      featured: {
        type: Boolean,
        default: false,
      },
    },
    {
      timestamps: true,
    },
  );

testimonialSchema.index({
  status: 1,
  featured: 1,
  createdAt: -1,
});

testimonialSchema.index({
  status: 1,
  createdAt: -1,
});

export const Testimonial =
  mongoose.model<ITestimonial>(
    "Testimonial",
    testimonialSchema,
  );