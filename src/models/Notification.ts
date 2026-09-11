import mongoose, {
  Document,
  Schema,
} from "mongoose";

export type NotificationType =
  | "appointment"
  | "intake"
  | "workshop"
  | "broadcast"
  | "system";

export interface INotification
  extends Document {
  userId: mongoose.Types.ObjectId;

  type: NotificationType;

  title: string;
  message: string;

  isRead: boolean;
  readAt?: Date;

  link?: string;

  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema =
  new Schema<INotification>(
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      type: {
        type: String,
        enum: [
          "appointment",
          "intake",
          "workshop",
          "broadcast",
          "system",
        ],
        required: true,
      },

      title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
      },

      message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000,
      },

      isRead: {
        type: Boolean,
        default: false,
        index: true,
      },

      readAt: {
        type: Date,
      },

      link: {
        type: String,
        trim: true,
        maxlength: 1000,
      },
    },
    {
      timestamps: true,
    },
  );

notificationSchema.index({
  userId: 1,
  createdAt: -1,
});

notificationSchema.index({
  userId: 1,
  isRead: 1,
  createdAt: -1,
});

export const Notification =
  mongoose.model<INotification>(
    "Notification",
    notificationSchema,
  );