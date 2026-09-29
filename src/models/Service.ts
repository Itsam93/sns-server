import mongoose, {
  Document,
  Schema,
} from "mongoose";

import {
  SUPPORTED_CURRENCIES,
  type Currency,
} from "../config/currencies.js";

export type ServiceType =
  | "single_session"
  | "session_package";

export interface IService
  extends Document {
  name: string;
  slug: string;
  description: string;

  type: ServiceType;

  durationMinutes: number;
  sessionCount?: number;

  pricing: Map<
    Currency,
    mongoose.Types.Decimal128
  >;

  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const serviceSchema =
  new Schema<IService>(
    {
      name: {
        type: String,
        required: [
          true,
          "Service name is required.",
        ],
        trim: true,
      },

      slug: {
        type: String,
        required: [
          true,
          "Service slug is required.",
        ],
        unique: true,
        lowercase: true,
        trim: true,
      },

      description: {
        type: String,
        required: [
          true,
          "Service description is required.",
        ],
        trim: true,
      },

      type: {
        type: String,
        enum: [
          "single_session",
          "session_package",
        ],
        required: [
          true,
          "Service type is required.",
        ],
      },

      durationMinutes: {
        type: Number,
        required: [
          true,
          "Service duration is required.",
        ],
        min: [
          15,
          "Service duration must be at least 15 minutes.",
        ],
        validate: {
          validator: (value: number) =>
            Number.isInteger(value),
          message:
            "Service duration must be a whole number.",
        },
      },

      sessionCount: {
        type: Number,
        min: [
          1,
          "Session count must be at least 1.",
        ],
        validate: {
          validator: (value: number) =>
            Number.isInteger(value),
          message:
            "Session count must be a whole number.",
        },
      },

      pricing: {
        type: Map,
        of: {
          type: Schema.Types.Decimal128,
          min: [
            0.01,
            "Service price must be greater than zero.",
          ],
        },
        required: [
          true,
          "Service pricing is required.",
        ],
        validate: {
          validator: (
            value: Map<
              string,
              mongoose.Types.Decimal128
            >,
          ) => {
            if (!value || value.size === 0) {
              return false;
            }

            return Array.from(
              value.keys(),
            ).every((currency) =>
              (
                SUPPORTED_CURRENCIES as readonly string[]
              ).includes(currency),
            );
          },
          message:
            "Service pricing contains an unsupported currency.",
        },
      },

      isActive: {
        type: Boolean,
        default: true,
      },
    },
    {
      timestamps: true,
      strict: true,
      strictQuery: true,

      toJSON: {
        transform: (_document, ret) => {
          const serialized =
            ret as unknown as Record<
              string,
              unknown
            >;

          const pricing =
            serialized.pricing;

          if (pricing instanceof Map) {
            const normalizedPricing: Record<
              string,
              number
            > = {};

            for (
              const [
                currency,
                amount,
              ] of pricing.entries()
            ) {
              normalizedPricing[currency] =
                Number(
                  amount.toString(),
                );
            }

            serialized.pricing =
              normalizedPricing;
          }

          return serialized;
        },
      },
    },
  );

serviceSchema.pre(
  "validate",
  function () {
    if (
      this.type === "session_package" &&
      !this.sessionCount
    ) {
      this.invalidate(
        "sessionCount",
        "Session count is required for a session package.",
      );
    }

    if (
      this.type === "single_session" &&
      this.sessionCount !== undefined &&
      this.sessionCount !== 1
    ) {
      this.invalidate(
        "sessionCount",
        "A single-session service must have a session count of 1.",
      );
    }

    if (
      !this.pricing ||
      this.pricing.size === 0
    ) {
      this.invalidate(
        "pricing",
        "At least one service price is required.",
      );
    }

    for (
      const currency of
        this.pricing?.keys() ?? []
    ) {
      if (
        !(
          SUPPORTED_CURRENCIES as readonly string[]
        ).includes(currency)
      ) {
        this.invalidate(
          "pricing",
          `Unsupported service pricing currency "${currency}".`,
        );
      }
    }
  },
);

export const Service =
  mongoose.model<IService>(
    "Service",
    serviceSchema,
  );

export default Service;