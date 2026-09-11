import mongoose, {
  Document,
  Schema,
} from "mongoose";

export type BroadcastEmailStatus =
  | "pending"
  | "sent"
  | "failed";

export interface IBroadcastRecipient
  extends Document {
  broadcastId: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;

  email: string;

  emailStatus: BroadcastEmailStatus;
  emailSentAt?: Date;
  emailError?: string;

  createdAt: Date;
  updatedAt: Date;
}

const broadcastRecipientSchema =
  new Schema<IBroadcastRecipient>(
    {
      broadcastId: {
        type: Schema.Types.ObjectId,
        ref: "Broadcast",
        required: true,
        index: true,
        immutable: true,
      },

      clientId: {
        type: Schema.Types.ObjectId,
        ref: "Client",
        required: true,
        index: true,
        immutable: true,
      },

      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
        immutable: true,
      },

      email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        maxlength: 320,
      },

      emailStatus: {
        type: String,
        enum: [
          "pending",
          "sent",
          "failed",
        ],
        default: "pending",
        required: true,
        index: true,
      },

      emailSentAt: {
        type: Date,
      },

      emailError: {
        type: String,
        trim: true,
        maxlength: 2000,
      },
    },
    {
      timestamps: true,
      strict: true,
      strictQuery: true,
    },
  );

broadcastRecipientSchema.index(
  {
    broadcastId: 1,
    clientId: 1,
  },
  {
    unique: true,
  },
);

broadcastRecipientSchema.index({
  broadcastId: 1,
  emailStatus: 1,
});

broadcastRecipientSchema.index({
  userId: 1,
  createdAt: -1,
});

export const BroadcastRecipient =
  mongoose.model<IBroadcastRecipient>(
    "BroadcastRecipient",
    broadcastRecipientSchema,
  );