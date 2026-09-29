import mongoose, {
  Document,
  Schema,
} from "mongoose";

import {
  SUPPORTED_CURRENCIES,
  type Currency,
} from "../config/currencies.js";

export type ProgrammeStatus =
  | "draft"
  | "published"
  | "ongoing"
  | "completed"
  | "cancelled";

export type ProgrammePricingType =
  | "early_bird"
  | "standard"
  | "one_on_one";

export interface IProgrammePricingOption {
  code: ProgrammePricingType;
  name: string;
  description?: string;

  pricing: Map<
    Currency,
    mongoose.Types.Decimal128
  >;

  availableFrom?: Date;
  availableUntil?: Date;

  isActive: boolean;
}

export interface IProgrammeGroupDiscount {
  minParticipants: number;
  discountPercent: number;
  isActive: boolean;
}

export interface IProgramme
  extends Document {
  title: string;
  slug: string;

  description: string;
  shortDescription?: string;

  startDate: Date;
  endDate: Date;

  durationWeeks?: number;

  capacity?: number;
  reservedCapacity: number;

  pricingOptions: IProgrammePricingOption[];
  groupDiscounts: IProgrammeGroupDiscount[];

  status: ProgrammeStatus;

  featuredImage?: string;

  createdAt: Date;
  updatedAt: Date;
}

const pricingOptionSchema =
  new Schema<IProgrammePricingOption>(
    {
      code: {
        type: String,
        enum: [
          "early_bird",
          "standard",
          "one_on_one",
        ],
        required: [
          true,
          "Programme pricing option code is required.",
        ],
        trim: true,
        lowercase: true,
      },

      name: {
        type: String,
        required: [
          true,
          "Programme pricing option name is required.",
        ],
        trim: true,
        maxlength: 150,
      },

      description: {
        type: String,
        trim: true,
        maxlength: 500,
      },

      pricing: {
        type: Map,
        of: {
          type: Schema.Types.Decimal128,
          min: [
            0.01,
            "Programme price must be greater than zero.",
          ],
        },
        required: [
          true,
          "Programme pricing is required.",
        ],
        validate: {
          validator: (
            value: Map<string, mongoose.Types.Decimal128>,
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
            "Programme pricing contains an unsupported currency.",
        },
      },

      availableFrom: {
        type: Date,
      },

      availableUntil: {
        type: Date,
      },

      isActive: {
        type: Boolean,
        default: true,
      },
    },
    {
      _id: false,
      strict: true,
      strictQuery: true,
    },
  );

const groupDiscountSchema =
  new Schema<IProgrammeGroupDiscount>(
    {
      minParticipants: {
        type: Number,
        required: [
          true,
          "Minimum participant count is required.",
        ],
        min: [
          2,
          "Minimum participant count must be at least 2.",
        ],
        validate: {
          validator: (value: number) =>
            Number.isInteger(value),
          message:
            "Minimum participant count must be a whole number.",
        },
      },

      discountPercent: {
        type: Number,
        required: [
          true,
          "Group discount percentage is required.",
        ],
        min: [
          0,
          "Group discount cannot be negative.",
        ],
        max: [
          100,
          "Group discount cannot exceed 100 percent.",
        ],
      },

      isActive: {
        type: Boolean,
        default: true,
      },
    },
    {
      _id: false,
      strict: true,
      strictQuery: true,
    },
  );

const programmeSchema =
  new Schema<IProgramme>(
    {
      title: {
        type: String,
        required: [
          true,
          "Programme title is required.",
        ],
        trim: true,
        maxlength: 200,
      },

      slug: {
        type: String,
        required: [
          true,
          "Programme slug is required.",
        ],
        unique: true,
        lowercase: true,
        trim: true,
        maxlength: 250,
      },

      description: {
        type: String,
        required: [
          true,
          "Programme description is required.",
        ],
        trim: true,
      },

      shortDescription: {
        type: String,
        trim: true,
        maxlength: 500,
      },

      startDate: {
        type: Date,
        required: [
          true,
          "Programme start date is required.",
        ],
      },

      endDate: {
        type: Date,
        required: [
          true,
          "Programme end date is required.",
        ],
      },

      durationWeeks: {
        type: Number,
        min: [
          1,
          "Programme duration must be at least one week.",
        ],
        validate: {
          validator: (value: number) =>
            Number.isInteger(value),
          message:
            "Programme duration must be a whole number.",
        },
      },

      capacity: {
        type: Number,
        min: [
          1,
          "Programme capacity must be at least 1.",
        ],
        validate: {
          validator: (value: number) =>
            Number.isInteger(value),
          message:
            "Programme capacity must be a whole number.",
        },
      },

      reservedCapacity: {
        type: Number,
        required: true,
        default: 0,
        min: [
          0,
          "Reserved programme capacity cannot be negative.",
        ],
        validate: {
          validator: (value: number) =>
            Number.isInteger(value),
          message:
            "Reserved programme capacity must be a whole number.",
        },
      },

      pricingOptions: {
        type: [pricingOptionSchema],
        required: [
          true,
          "At least one programme pricing option is required.",
        ],
        validate: {
          validator: (
            value: IProgrammePricingOption[],
          ) => value.length > 0,
          message:
            "A programme must have at least one pricing option.",
        },
      },

      groupDiscounts: {
        type: [groupDiscountSchema],
        default: [],
      },

      status: {
        type: String,
        enum: [
          "draft",
          "published",
          "ongoing",
          "completed",
          "cancelled",
        ],
        default: "draft",
        required: true,
        index: true,
      },

      featuredImage: {
        type: String,
        trim: true,
        maxlength: 1000,
      },
    },
    {
      timestamps: true,
      strict: true,
      strictQuery: true,
    },
  );

programmeSchema.pre(
  "validate",
  function () {
    if (this.endDate <= this.startDate) {
      this.invalidate(
        "endDate",
        "Programme end date must be after start date.",
      );
    }

    if (
      typeof this.capacity === "number" &&
      this.reservedCapacity > this.capacity
    ) {
      this.invalidate(
        "reservedCapacity",
        "Reserved programme capacity cannot exceed programme capacity.",
      );
    }

    const pricingCodes =
      this.pricingOptions?.map(
        (option) => option.code,
      ) ?? [];

    if (
      new Set(pricingCodes).size !==
      pricingCodes.length
    ) {
      this.invalidate(
        "pricingOptions",
        "Programme pricing option codes must be unique.",
      );
    }

    for (
      const option of this.pricingOptions ?? []
    ) {
      if (
        !option.pricing ||
        option.pricing.size === 0
      ) {
        this.invalidate(
          "pricingOptions",
          `Pricing option "${option.name}" must have at least one price.`,
        );
      }

      if (
        option.availableFrom &&
        option.availableUntil &&
        option.availableUntil <=
          option.availableFrom
      ) {
        this.invalidate(
          "pricingOptions",
          `Pricing option "${option.name}" must have an availability end date after its start date.`,
        );
      }

      if (
        option.availableFrom &&
        option.availableFrom < this.startDate
      ) {
        this.invalidate(
          "pricingOptions",
          `Pricing option "${option.name}" cannot start before the programme.`,
        );
      }

      if (
        option.availableUntil &&
        option.availableUntil > this.endDate
      ) {
        this.invalidate(
          "pricingOptions",
          `Pricing option "${option.name}" cannot remain available after the programme ends.`,
        );
      }

      for (
        const currency of option.pricing.keys()
      ) {
        if (
          !(
            SUPPORTED_CURRENCIES as readonly string[]
          ).includes(currency)
        ) {
          this.invalidate(
            "pricingOptions",
            `Pricing option "${option.name}" contains unsupported currency "${currency}".`,
          );
        }
      }
    }

    const discountThresholds =
      this.groupDiscounts?.map(
        (discount) =>
          discount.minParticipants,
      ) ?? [];

    if (
      new Set(discountThresholds).size !==
      discountThresholds.length
    ) {
      this.invalidate(
        "groupDiscounts",
        "Group discount participant thresholds must be unique.",
      );
    }
  },
);

programmeSchema.index({
  status: 1,
  startDate: 1,
});

export const Programme =
  mongoose.model<IProgramme>(
    "Programme",
    programmeSchema,
  );