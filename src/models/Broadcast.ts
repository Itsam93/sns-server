import mongoose, {
  Document,
  Schema,
} from "mongoose";

export type BroadcastRecipientType =
  | "all"
  | "selected";

export type BroadcastStatus =
  | "draft"
  | "sending"
  | "sent"
  | "partially_sent"
  | "failed";

export interface IBroadcast
  extends Document {
  title: string;
  message: string;

  recipientType: BroadcastRecipientType;

  status: BroadcastStatus;

  totalRecipients: number;
  emailsSent: number;
  emailsFailed: number;

  createdBy: mongoose.Types.ObjectId;

  sentAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const broadcastSchema =
  new Schema<IBroadcast>(
    {
      title: {
        type: String,
        required: [
          true,
          "Broadcast title is required",
        ],
        trim: true,
        maxlength: 200,
      },

      message: {
        type: String,
        required: [
          true,
          "Broadcast message is required",
        ],
        trim: true,
        maxlength: 10000,
      },

      recipientType: {
        type: String,
        enum: [
          "all",
          "selected",
        ],
        required: true,
      },

      status: {
        type: String,
        enum: [
          "draft",
          "sending",
          "sent",
          "partially_sent",
          "failed",
        ],
        default: "draft",
        required: true,
        index: true,
      },

      totalRecipients: {
        type: Number,
        default: 0,
        min: 0,
      },

      emailsSent: {
        type: Number,
        default: 0,
        min: 0,
      },

      emailsFailed: {
        type: Number,
        default: 0,
        min: 0,
      },

      createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        immutable: true,
        index: true,
      },

      sentAt: {
        type: Date,
      },
    },
    {
      timestamps: true,
      strict: true,
      strictQuery: true,
    },
  );

broadcastSchema.index({
  status: 1,
  createdAt: -1,
});

broadcastSchema.index({
  createdBy: 1,
  createdAt: -1,
});

export const Broadcast =
  mongoose.model<IBroadcast>(
    "Broadcast",
    broadcastSchema,
  );