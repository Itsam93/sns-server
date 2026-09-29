import mongoose, {
  Document,
  Schema,
} from "mongoose";

export type PaymentWebhookProcessingStatus =
  | "received"
  | "processing"
  | "processed"
  | "failed";

export interface IPaymentWebhookEvent
  extends Document {
  eventType: string;
  transactionId: string;
  transactionReference?: string;
  status?: string;
  eventKey: string;
  payloadHash?: string;

  processingStatus: PaymentWebhookProcessingStatus;
  attemptCount: number;

  lastAttemptAt?: Date;
  nextRetryAt?: Date;
  lastError?: string;
  processedAt?: Date;

  receivedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const HEX_REGEX = /^[a-fA-F0-9]+$/;

const paymentWebhookEventSchema =
  new Schema<IPaymentWebhookEvent>(
    {
      eventType: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
      },

      transactionId: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
      },

      transactionReference: {
        type: String,
        trim: true,
        maxlength: 200,
      },

      status: {
        type: String,
        trim: true,
        maxlength: 100,
      },

      eventKey: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        maxlength: 255,
      },

      payloadHash: {
        type: String,
        trim: true,
        maxlength: 128,
        match: HEX_REGEX,
      },

      processingStatus: {
        type: String,
        enum: [
          "received",
          "processing",
          "processed",
          "failed",
        ],
        required: true,
        default: "received",
        index: true,
      },

      attemptCount: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
        max: 100,
        validate: {
          validator: Number.isInteger,
          message:
            "Attempt count must be an integer",
        },
      },

      lastAttemptAt: {
        type: Date,
      },

      nextRetryAt: {
        type: Date,
      },

      lastError: {
        type: String,
        trim: true,
        maxlength: 4000,
      },

      processedAt: {
        type: Date,
      },

      receivedAt: {
        type: Date,
        required: true,
        default: Date.now,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    },
  );

paymentWebhookEventSchema.index({
  processingStatus: 1,
  nextRetryAt: 1,
});

paymentWebhookEventSchema.index({
  transactionId: 1,
  receivedAt: 1,
});

paymentWebhookEventSchema.index({
  transactionReference: 1,
  receivedAt: 1,
});

paymentWebhookEventSchema.index({
  payloadHash: 1,
});

paymentWebhookEventSchema.pre(
  "validate",
  function () {
    const event = this;

    if (
      event.processingStatus ===
      "processed"
    ) {
      if (!event.processedAt) {
        throw new Error(
          "Processed webhook event requires processedAt",
        );
      }

      if (event.nextRetryAt) {
        throw new Error(
          "Processed webhook event cannot have nextRetryAt",
        );
      }
    }

    if (
      event.processingStatus ===
      "processing"
    ) {
      if (!event.lastAttemptAt) {
        throw new Error(
          "Processing webhook event requires lastAttemptAt",
        );
      }

      if (event.processedAt) {
        throw new Error(
          "Processing webhook event cannot have processedAt",
        );
      }
    }

    if (
      event.processingStatus ===
      "failed"
    ) {
      if (!event.lastError) {
        throw new Error(
          "Failed webhook event requires lastError",
        );
      }

      if (event.processedAt) {
        throw new Error(
          "Failed webhook event cannot have processedAt",
        );
      }
    }

    if (
      event.processingStatus ===
        "received" &&
      event.processedAt
    ) {
      throw new Error(
        "Received webhook event cannot have processedAt",
      );
    }

    if (
      event.lastAttemptAt &&
      event.lastAttemptAt <
        event.receivedAt
    ) {
      throw new Error(
        "lastAttemptAt cannot be before receivedAt",
      );
    }

    if (
      event.nextRetryAt &&
      event.nextRetryAt <
        event.receivedAt
    ) {
      throw new Error(
        "nextRetryAt cannot be before receivedAt",
      );
    }

    if (
      event.processedAt &&
      event.processedAt <
        event.receivedAt
    ) {
      throw new Error(
        "processedAt cannot be before receivedAt",
      );
    }
  },
);

export const PaymentWebhookEvent =
  mongoose.model<IPaymentWebhookEvent>(
    "PaymentWebhookEvent",
    paymentWebhookEventSchema,
  );

export default PaymentWebhookEvent;