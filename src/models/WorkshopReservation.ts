
import mongoose, {
  Schema,
  type Document,
} from "mongoose";

import {
  SUPPORTED_CURRENCIES,
  type Currency,
} from "../config/currencies.js";

export type WorkshopReservationStatus =
  | "pending"
  | "confirmed"
  | "expired"
  | "cancelled"
  | "recovered";

export interface IWorkshopReservation extends Document {
  workshopId: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  paymentId?: mongoose.Types.ObjectId;

  ticketCode: string;
  ticketName: string;
  attendeeCount: number;

  amount: mongoose.Types.Decimal128;
  currency: Currency;

  fullName: string;
  email: string;
  phone: string;
  organisationName?: string;

  status: WorkshopReservationStatus;
  expiresAt: Date;

  confirmedAt?: Date;
  cancelledAt?: Date;
  expiredAt?: Date;
  recoveredAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const workshopReservationSchema =
  new Schema<IWorkshopReservation>(
    {
      workshopId: {
        type: Schema.Types.ObjectId,
        ref: "Workshop",
        required: true,
        index: true,
      },

      clientId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      paymentId: {
        type: Schema.Types.ObjectId,
        ref: "Payment",
        default: undefined,
      },

      ticketCode: {
        type: String,
        required: true,
        trim: true,
      },

      ticketName: {
        type: String,
        required: true,
        trim: true,
      },

      attendeeCount: {
        type: Number,
        required: true,
        min: 1,
        validate: {
          validator: Number.isInteger,
          message: "Attendee count must be a whole number.",
        },
      },

      amount: {
        type: Schema.Types.Decimal128,
        required: true,
        validate: {
          validator: (value: mongoose.Types.Decimal128) => {
            const amount = Number(value.toString());

            return Number.isFinite(amount) && amount >= 0;
          },
          message:
            "Reservation amount must be a valid non-negative number.",
        },
      },

      currency: {
        type: String,
        enum: SUPPORTED_CURRENCIES,
        required: true,
      },

      fullName: {
        type: String,
        required: true,
        trim: true,
      },

      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
      },

      phone: {
        type: String,
        required: true,
        trim: true,
      },

      organisationName: {
        type: String,
        trim: true,
        default: undefined,
      },

      status: {
        type: String,
        enum: [
          "pending",
          "confirmed",
          "expired",
          "cancelled",
          "recovered",
        ],
        default: "pending",
        required: true,
      },

      expiresAt: {
        type: Date,
        required: true,
      },

      confirmedAt: {
        type: Date,
        default: undefined,
      },

      cancelledAt: {
        type: Date,
        default: undefined,
      },

      expiredAt: {
        type: Date,
        default: undefined,
      },

      recoveredAt: {
        type: Date,
        default: undefined,
      },
    },
    {
      timestamps: true,
      versionKey: false,
      strict: true,
    },
  );

workshopReservationSchema.pre(
  "validate",
  function validateReservationLifecycle() {
    const timestamps = {
      confirmedAt: this.confirmedAt,
      cancelledAt: this.cancelledAt,
      expiredAt: this.expiredAt,
      recoveredAt: this.recoveredAt,
    };

    const expectedTimestamp: Record<
      WorkshopReservationStatus,
      keyof typeof timestamps | null
    > = {
      pending: null,
      confirmed: "confirmedAt",
      cancelled: "cancelledAt",
      expired: "expiredAt",
      recovered: "recoveredAt",
    };

    const requiredTimestamp = expectedTimestamp[this.status];

    for (const [field, value] of Object.entries(timestamps)) {
      if (field !== requiredTimestamp && value != null) {
        this.invalidate(
          field,
          `${field} is not permitted when reservation status is ${this.status}.`,
        );
      }
    }

    if (
      requiredTimestamp &&
      timestamps[requiredTimestamp] == null
    ) {
      this.invalidate(
        requiredTimestamp,
        `${requiredTimestamp} is required when reservation status is ${this.status}.`,
      );
    }
  },
);

workshopReservationSchema.index(
  {
    clientId: 1,
    workshopId: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      status: {
        $in: ["pending", "confirmed", "recovered"],
      },
    },
  },
);

workshopReservationSchema.index(
  {
    paymentId: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      paymentId: {
        $exists: true,
      },
    },
  },
);

workshopReservationSchema.index({
  workshopId: 1,
  status: 1,
});

workshopReservationSchema.index({
  clientId: 1,
  status: 1,
  expiresAt: 1,
});


const WorkshopReservation: mongoose.Model<IWorkshopReservation> =
  (mongoose.models.WorkshopReservation as
    | mongoose.Model<IWorkshopReservation>
    | undefined) ??
  mongoose.model<IWorkshopReservation>(
    "WorkshopReservation",
    workshopReservationSchema,
  );

export default WorkshopReservation;
