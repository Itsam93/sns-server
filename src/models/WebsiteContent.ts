import mongoose, {
  Document,
  Schema,
} from "mongoose";

export type WebsiteContentSection =
  | "homepage"
  | "about"
  | "organisation"
  | "mission"
  | "vision"
  | "core_values"
  | "founder_message"
  | "contact";

export interface IWebsiteContent
  extends Document {
  section: WebsiteContentSection;

  title?: string;

  content: string;

  metadata?: Record<
    string,
    unknown
  >;

  isPublished: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const websiteContentSchema =
  new Schema<IWebsiteContent>(
    {
      section: {
        type: String,
        enum: [
          "homepage",
          "about",
          "organisation",
          "mission",
          "vision",
          "core_values",
          "founder_message",
          "contact",
        ],
        required: [
          true,
          "Content section is required.",
        ],
        unique: true,
        index: true,
      },

      title: {
        type: String,
        trim: true,
        maxlength: 250,
      },

      content: {
        type: String,
        required: [
          true,
          "Content is required.",
        ],
        trim: true,
        maxlength: 50000,
      },

      metadata: {
        type: Schema.Types.Mixed,
      },

      isPublished: {
        type: Boolean,
        default: false,
        required: true,
        index: true,
      },
    },
    {
      timestamps: true,
    },
  );

websiteContentSchema.index({
  section: 1,
  isPublished: 1,
});

export const WebsiteContent =
  mongoose.model<IWebsiteContent>(
    "WebsiteContent",
    websiteContentSchema,
  );