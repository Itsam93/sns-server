import mongoose, {
  Document,
  Schema,
} from "mongoose";

export type ServicePackageStatus =
  | "active"
  | "completed"
  | "expired"
  | "cancelled";

export interface IServicePackage
  extends Document {
  clientId: mongoose.Types.ObjectId;
  serviceId: mongoose.Types.ObjectId;

  totalSessions: number;
  usedSessions: number;
  remainingSessions: number;

  status: ServicePackageStatus;

  purchasedAt: Date;
  expiresAt?: Date;
  lastUsedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const servicePackageSchema =
  new Schema<IServicePackage>(
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

      serviceId: {
        type: Schema.Types.ObjectId,
        ref: "Service",
        required: [
          true,
          "Service is required.",
        ],
        index: true,
      },

      totalSessions: {
        type: Number,
        required: [
          true,
          "Total sessions are required.",
        ],
        min: [
          1,
          "Total sessions must be at least 1.",
        ],
        validate: {
          validator: (value: number) =>
            Number.isInteger(value),
          message:
            "Total sessions must be a whole number.",
        },
      },

      usedSessions: {
        type: Number,
        required: true,
        default: 0,
        min: [
          0,
          "Used sessions cannot be negative.",
        ],
        validate: {
          validator: (value: number) =>
            Number.isInteger(value),
          message:
            "Used sessions must be a whole number.",
        },
      },

      remainingSessions: {
        type: Number,
        required: true,
        default: 0,
        min: [
          0,
          "Remaining sessions cannot be negative.",
        ],
        validate: {
          validator: (value: number) =>
            Number.isInteger(value),
          message:
            "Remaining sessions must be a whole number.",
        },
      },

      status: {
        type: String,
        enum: [
          "active",
          "completed",
          "expired",
          "cancelled",
        ],
        required: true,
        default: "active",
        index: true,
      },

      purchasedAt: {
        type: Date,
        required: [
          true,
          "Purchase date is required.",
        ],
        index: true,
      },

      expiresAt: {
        type: Date,
        index: true,
      },

      lastUsedAt: {
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

servicePackageSchema.pre(
  "validate",
  function () {
    if (
      this.usedSessions >
      this.totalSessions
    ) {
      this.invalidate(
        "usedSessions",
        "Used sessions cannot exceed total sessions.",
      );
    }

    const calculatedRemaining =
      this.totalSessions -
      this.usedSessions;

    this.remainingSessions =
      calculatedRemaining;

    if (
      this.expiresAt &&
      this.expiresAt <= this.purchasedAt
    ) {
      this.invalidate(
        "expiresAt",
        "Expiry date must be after purchase date.",
      );
    }

    if (
      this.usedSessions ===
        this.totalSessions &&
      this.status === "active"
    ) {
      this.status = "completed";
    }

    if (
      this.remainingSessions > 0 &&
      this.status === "completed"
    ) {
      this.invalidate(
        "status",
        "A package with remaining sessions cannot be completed.",
      );
    }

    if (
      this.remainingSessions === 0 &&
      this.status === "active"
    ) {
      this.status = "completed";
    }
  },
);

servicePackageSchema.index({
  clientId: 1,
  status: 1,
});

servicePackageSchema.index({
  clientId: 1,
  serviceId: 1,
  status: 1,
});

servicePackageSchema.index({
  status: 1,
  expiresAt: 1,
});

export const ServicePackage =
  mongoose.model<IServicePackage>(
    "ServicePackage",
    servicePackageSchema,
  );

export default ServicePackage;