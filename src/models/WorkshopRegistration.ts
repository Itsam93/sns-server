import mongoose, {
  Document,
  Schema,
} from "mongoose";
import {
  SUPPORTED_CURRENCIES,
  type Currency,
} from "../config/currencies.js";

export type WorkshopRegistrationStatus =
  | "registered"
  | "attended"
  | "cancelled"
  | "refunded";

export interface IWorkshopRegistration
  extends Document {
  clientId?: mongoose.Types.ObjectId;
  workshopId: mongoose.Types.ObjectId;
  paymentId: mongoose.Types.ObjectId;
  ticketCode: string;
  ticketName: string;
  attendeeCount: number;
  amountPaid: mongoose.Types.Decimal128;
  currency: Currency;
  fullName: string;
  email: string;
  phone?: string;
  organisationName?: string;
  status: WorkshopRegistrationStatus;
  registeredAt: Date;
  attendedAt?: Date;
  cancelledAt?: Date;
  refundedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EMAIL_REGEX =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const workshopRegistrationSchema =
  new Schema<IWorkshopRegistration>(
    {
      clientId: {
        type: Schema.Types.ObjectId,
        ref: "Client",
        index: true,
      },

      workshopId: {
        type: Schema.Types.ObjectId,
        ref: "Workshop",
        required: [
          true,
          "Workshop is required.",
        ],
        index: true,
      },

      paymentId: {
        type: Schema.Types.ObjectId,
        ref: "Payment",
        required: [
          true,
          "Payment is required.",
        ],
        unique: true,
        index: true,
      },

      ticketCode: {
        type: String,
        required: [
          true,
          "Ticket code is required.",
        ],
        trim: true,
        lowercase: true,
        maxlength: 50,
      },

      ticketName: {
        type: String,
        required: [
          true,
          "Ticket name is required.",
        ],
        trim: true,
        maxlength: 150,
      },

      attendeeCount: {
        type: Number,
        required: [
          true,
          "Attendee count is required.",
        ],
        min: [
          1,
          "Attendee count must be at least 1.",
        ],
        validate: {
          validator: (value: number) =>
            Number.isInteger(value),
          message:
            "Attendee count must be a whole number.",
        },
      },

      amountPaid: {
        type: Schema.Types.Decimal128,
        required: [
          true,
          "Amount paid is required.",
        ],
        min: [
          0.01,
          "Amount paid must be greater than zero.",
        ],
      },

      currency: {
        type: String,
        enum: SUPPORTED_CURRENCIES,
        required: [
          true,
          "Payment currency is required.",
        ],
      },

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
        trim: true,
        lowercase: true,
        maxlength: 320,
        match: [
          EMAIL_REGEX,
          "Invalid email address.",
        ],
      },

      phone: {
        type: String,
        trim: true,
        maxlength: 50,
      },

      organisationName: {
        type: String,
        trim: true,
        maxlength: 200,
      },

      status: {
        type: String,
        enum: [
          "registered",
          "attended",
          "cancelled",
          "refunded",
        ],
        required: true,
        default: "registered",
        index: true,
      },

      registeredAt: {
        type: Date,
        required: [
          true,
          "Registration date is required.",
        ],
        default: Date.now,
        index: true,
      },

      attendedAt: {
        type: Date,
      },

      cancelledAt: {
        type: Date,
      },

      refundedAt: {
        type: Date,
      },
    },
    {
      timestamps: true,
      versionKey: false,
      strict: true,
      strictQuery: true,
    },
  );

workshopRegistrationSchema.index({
  clientId: 1,
  status: 1,
});

workshopRegistrationSchema.index({
  workshopId: 1,
  status: 1,
});

workshopRegistrationSchema.index({
  workshopId: 1,
  ticketCode: 1,
  status: 1,
});

workshopRegistrationSchema.index({
  workshopId: 1,
  registeredAt: 1,
});

workshopRegistrationSchema.index(
  {
    clientId: 1,
    workshopId: 1,
  },
  {
    unique: true,
    name:
      "unique_active_client_workshop_registration",
    partialFilterExpression: {
      clientId: {
        $exists: true,
        $ne: null,
      },
      status: {
        $in: [
          "registered",
          "attended",
        ],
      },
    },
  },
);

workshopRegistrationSchema.pre(
  "validate",
  function () {
    const registration = this;

    if (
      registration.status === "attended" &&
      !registration.attendedAt
    ) {
      registration.invalidate(
        "attendedAt",
        "Attended registration requires attendedAt.",
      );
    }

    if (
      registration.status === "cancelled" &&
      !registration.cancelledAt
    ) {
      registration.invalidate(
        "cancelledAt",
        "Cancelled registration requires cancelledAt.",
      );
    }

    if (
      registration.status === "refunded" &&
      !registration.refundedAt
    ) {
      registration.invalidate(
        "refundedAt",
        "Refunded registration requires refundedAt.",
      );
    }

    if (
      registration.status === "registered" &&
      registration.attendedAt
    ) {
      registration.invalidate(
        "attendedAt",
        "A registered workshop participant cannot have an attendance date.",
      );
    }

    if (
      registration.status !== "cancelled" &&
      registration.cancelledAt
    ) {
      registration.invalidate(
        "cancelledAt",
        "Only a cancelled registration can have a cancellation date.",
      );
    }

    if (
      registration.status !== "refunded" &&
      registration.refundedAt
    ) {
      registration.invalidate(
        "refundedAt",
        "Only a refunded registration can have a refund date.",
      );
    }

    if (
      registration.status !== "attended" &&
      registration.attendedAt
    ) {
      registration.invalidate(
        "attendedAt",
        "Only an attended registration can have an attendance date.",
      );
    }

    if (
      registration.status === "attended" &&
      registration.cancelledAt
    ) {
      registration.invalidate(
        "cancelledAt",
        "An attended registration cannot have a cancellation date.",
      );
    }

    if (
      registration.status === "attended" &&
      registration.refundedAt
    ) {
      registration.invalidate(
        "refundedAt",
        "An attended registration cannot have a refund date.",
      );
    }

    if (
      registration.status === "cancelled" &&
      registration.refundedAt
    ) {
      registration.invalidate(
        "refundedAt",
        "A cancelled registration cannot have a refund date.",
      );
    }

    if (
      registration.status === "refunded" &&
      registration.cancelledAt
    ) {
      registration.invalidate(
        "cancelledAt",
        "A refunded registration cannot have a cancellation date.",
      );
    }
  },
);

export const WorkshopRegistration =
  mongoose.model<IWorkshopRegistration>(
    "WorkshopRegistration",
    workshopRegistrationSchema,
  );

export default WorkshopRegistration;