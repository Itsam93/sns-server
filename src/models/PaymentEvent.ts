import mongoose, {
  Document,
  Schema,
} from "mongoose";

import type {
  PaymentEventStatus,
} from "../types/payment.js";

export interface IPaymentEvent
  extends Document {
  provider: string;

  eventId: string;
  eventType: string;

  providerReference?: string;

  paymentId?: mongoose.Types.ObjectId;

  status: PaymentEventStatus;

  payload: unknown;

  processedAt?: Date;
  failedAt?: Date;

  errorMessage?: string;

  createdAt: Date;
  updatedAt: Date;
}

const paymentEventSchema =
  new Schema<IPaymentEvent>(
    {
      provider: {
        type: String,
        required: [
          true,
          "Payment provider is required.",
        ],
        trim: true,
        lowercase: true,
        maxlength: 100,
        index: true,
      },

      eventId: {
        type: String,
        required: [
          true,
          "Payment event ID is required.",
        ],
        trim: true,
        maxlength: 250,
      },

      eventType: {
        type: String,
        required: [
          true,
          "Payment event type is required.",
        ],
        trim: true,
        maxlength: 150,
      },

      providerReference: {
        type: String,
        trim: true,
        maxlength: 150,
        index: true,
      },

      paymentId: {
        type: Schema.Types.ObjectId,
        ref: "Payment",
        index: true,
      },

      status: {
        type: String,
        enum: [
          "received",
          "processed",
          "ignored",
          "failed",
        ],
        required: true,
        default: "received",
        index: true,
      },

      payload: {
        type: Schema.Types.Mixed,
        required: true,
      },

      processedAt: {
        type: Date,
      },

      failedAt: {
        type: Date,
      },

      errorMessage: {
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

paymentEventSchema.index(
  {
    provider: 1,
    eventId: 1,
  },
  {
    unique: true,
  },
);

paymentEventSchema.index({
  provider: 1,
  providerReference: 1,
  createdAt: -1,
});

paymentEventSchema.index({
  paymentId: 1,
  createdAt: -1,
});

paymentEventSchema.pre(
  "validate",
  function () {
    if (
      this.status === "processed" &&
      !this.processedAt
    ) {
      this.processedAt = new Date();
    }

    if (
      this.status === "failed" &&
      !this.failedAt
    ) {
      this.failedAt = new Date();
    }
  },
);

export const PaymentEvent =
  mongoose.model<IPaymentEvent>(
    "PaymentEvent",
    paymentEventSchema,
  );

export default PaymentEvent;