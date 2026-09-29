import mongoose, {
  Document,
  Schema,
} from "mongoose";

import type {
  Currency,
} from "../config/currencies.js";

import type {
  PaymentProductType,
  PaymentStatus,
} from "../types/payment.js";

export interface IPayment
  extends Document {
  clientId: mongoose.Types.ObjectId;

  reference: string;
  providerReference?: string;

  productType: PaymentProductType;
  productId: mongoose.Types.ObjectId;
  optionId?: string;

  productName: string;
  optionName?: string;

  amount: mongoose.Types.Decimal128;
  currency: Currency;

  status: PaymentStatus;

  idempotencyKey: string;

  checkoutUrl?: string;

  paidAt?: Date;
  failedAt?: Date;
  cancelledAt?: Date;
  expiredAt?: Date;
  refundedAt?: Date;

  failureReason?: string;

  metadata?: Map<string, string>;

  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema =
  new Schema<IPayment>(
    {
      clientId: {
        type: Schema.Types.ObjectId,
        ref: "Client",
        required: [
          true,
          "Client is required.",
        ],
        index: true,
      },

      reference: {
        type: String,
        required: [
          true,
          "Payment reference is required.",
        ],
        unique: true,
        index: true,
        trim: true,
        maxlength: 100,
      },

      providerReference: {
        type: String,
        trim: true,
        maxlength: 150,
      },

      productType: {
        type: String,
        enum: [
          "service",
          "programme",
          "workshop",
        ],
        required: [
          true,
          "Payment product type is required.",
        ],
        index: true,
      },

      productId: {
        type: Schema.Types.ObjectId,
        required: [
          true,
          "Payment product is required.",
        ],
        index: true,
      },

      optionId: {
        type: String,
        trim: true,
        maxlength: 100,
      },

      productName: {
        type: String,
        required: [
          true,
          "Payment product name is required.",
        ],
        trim: true,
        maxlength: 250,
      },

      optionName: {
        type: String,
        trim: true,
        maxlength: 250,
      },

      amount: {
        type: Schema.Types.Decimal128,
        required: [
          true,
          "Payment amount is required.",
        ],
        min: [
          0.01,
          "Payment amount must be greater than zero.",
        ],
      },

      currency: {
        type: String,
        enum: [
          "NGN",
          "USD",
          "GBP",
        ],
        required: [
          true,
          "Payment currency is required.",
        ],
      },

      status: {
        type: String,
        enum: [
          "pending",
          "processing",
          "successful",
          "failed",
          "cancelled",
          "expired",
          "refunded",
        ],
        required: true,
        default: "pending",
        index: true,
      },

      idempotencyKey: {
        type: String,
        required: [
          true,
          "Idempotency key is required.",
        ],
        trim: true,
        maxlength: 150,
      },

      checkoutUrl: {
        type: String,
        trim: true,
        maxlength: 2000,
      },

      paidAt: {
        type: Date,
      },

      failedAt: {
        type: Date,
      },

      cancelledAt: {
        type: Date,
      },

      expiredAt: {
        type: Date,
      },

      refundedAt: {
        type: Date,
      },

      failureReason: {
        type: String,
        trim: true,
        maxlength: 1000,
      },

      metadata: {
        type: Map,
        of: String,
      },
    },
    {
      timestamps: true,
      strict: true,
      strictQuery: true,
    },
  );

paymentSchema.index(
  {
    providerReference: 1,
  },
  {
    unique: true,
    sparse: true,
  },
);

paymentSchema.index(
  {
    clientId: 1,
    idempotencyKey: 1,
  },
  {
    unique: true,
  },
);

paymentSchema.index({
  clientId: 1,
  createdAt: -1,
});

paymentSchema.index({
  clientId: 1,
  status: 1,
  createdAt: -1,
});

paymentSchema.index({
  productType: 1,
  productId: 1,
  status: 1,
});

paymentSchema.pre(
  "validate",
  function () {
    if (
      this.status === "successful" &&
      !this.paidAt
    ) {
      this.paidAt = new Date();
    }

    if (
      this.status === "failed" &&
      !this.failedAt
    ) {
      this.failedAt = new Date();
    }

    if (
      this.status === "cancelled" &&
      !this.cancelledAt
    ) {
      this.cancelledAt = new Date();
    }

    if (
      this.status === "expired" &&
      !this.expiredAt
    ) {
      this.expiredAt = new Date();
    }

    if (
      this.status === "refunded" &&
      !this.refundedAt
    ) {
      this.refundedAt = new Date();
    }
  },
);

export const Payment =
  mongoose.model<IPayment>(
    "Payment",
    paymentSchema,
  );

export default Payment;