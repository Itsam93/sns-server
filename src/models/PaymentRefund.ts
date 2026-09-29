import mongoose, {
  Document,
  Schema,
} from "mongoose";

import type { Currency } from "../config/currencies.js";
import type {
  PaymentRefundStatus,
} from "../types/payment.js";

export interface IPaymentRefund extends Document {
  paymentId: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;

  reference: string;
  providerReference?: string;

  amount: mongoose.Types.Decimal128;
  currency: Currency;

  status: PaymentRefundStatus;

  reason?: string;
  failureReason?: string;

  requestedAt: Date;
  completedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const paymentRefundSchema =
  new Schema<IPaymentRefund>(
    {
      paymentId: {
        type: Schema.Types.ObjectId,
        ref: "Payment",
        required: true,
        index: true,
      },

      clientId: {
        type: Schema.Types.ObjectId,
        ref: "Client",
        required: true,
        index: true,
      },

      reference: {
        type: String,
        required: true,
        trim: true,
        maxlength: 150,
        unique: true,
        index: true,
      },

      providerReference: {
        type: String,
        trim: true,
        maxlength: 150,
        sparse: true,
        unique: true,
        index: true,
      },

      amount: {
        type: Schema.Types.Decimal128,
        required: true,
      },

      currency: {
        type: String,
        required: true,
        enum: ["NGN", "USD", "GBP"],
      },

      status: {
        type: String,
        required: true,
        enum: [
          "processing",
          "successful",
          "failed",
        ],
        default: "processing",
        index: true,
      },

      reason: {
        type: String,
        trim: true,
        maxlength: 500,
      },

      failureReason: {
        type: String,
        trim: true,
        maxlength: 2000,
      },

      requestedAt: {
        type: Date,
        required: true,
        default: Date.now,
      },

      completedAt: {
        type: Date,
      },
    },
    {
      timestamps: true,
      strict: true,
      strictQuery: true,
    },
  );

paymentRefundSchema.index({
  paymentId: 1,
  createdAt: -1,
});

paymentRefundSchema.index({
  clientId: 1,
  createdAt: -1,
});

paymentRefundSchema.index({
  paymentId: 1,
  status: 1,
});

export const PaymentRefund =
  mongoose.model<IPaymentRefund>(
    "PaymentRefund",
    paymentRefundSchema,
  );

export default PaymentRefund;