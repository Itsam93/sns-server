import mongoose, {
  Document,
  Schema,
} from "mongoose";

export type ContactMessageStatus =
  | "new"
  | "read"
  | "responded"
  | "archived";

export type ContactMessageCategory =
  | "general"
  | "appointment"
  | "counselling"
  | "workshop"
  | "partnership"
  | "other";

export interface IContactMessage
  extends Document {
  fullName: string;
  email: string;
  phone?: string;

  subject: string;
  message: string;

  category: ContactMessageCategory;

  status: ContactMessageStatus;

  adminNote?: string;

  respondedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const contactMessageSchema =
  new Schema<IContactMessage>(
    {
      fullName: {
        type: String,
        required: [
          true,
          "Full name is required.",
        ],
        trim: true,
        maxlength: 200,
      },

      email: {
        type: String,
        required: [
          true,
          "Email is required.",
        ],
        lowercase: true,
        trim: true,
        maxlength: 320,
      },

      phone: {
        type: String,
        trim: true,
        maxlength: 30,
      },

      subject: {
        type: String,
        required: [
          true,
          "Subject is required.",
        ],
        trim: true,
        maxlength: 250,
      },

      message: {
        type: String,
        required: [
          true,
          "Message is required.",
        ],
        trim: true,
        maxlength: 10000,
      },

      category: {
        type: String,
        enum: [
          "general",
          "appointment",
          "counselling",
          "workshop",
          "partnership",
          "other",
        ],
        default: "general",
        required: true,
        index: true,
      },

      status: {
        type: String,
        enum: [
          "new",
          "read",
          "responded",
          "archived",
        ],
        default: "new",
        required: true,
        index: true,
      },

      adminNote: {
        type: String,
        trim: true,
        maxlength: 3000,
      },

      respondedAt: {
        type: Date,
      },
    },
    {
      timestamps: true,
    },
  );

contactMessageSchema.index({
  status: 1,
  createdAt: -1,
});

contactMessageSchema.index({
  category: 1,
  createdAt: -1,
});

contactMessageSchema.index({
  email: 1,
  createdAt: -1,
});

export const ContactMessage =
  mongoose.model<IContactMessage>(
    "ContactMessage",
    contactMessageSchema,
  );