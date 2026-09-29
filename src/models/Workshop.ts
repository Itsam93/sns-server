import mongoose, {
  Document,
  Schema,
} from "mongoose";

import {
  SUPPORTED_CURRENCIES,
  type Currency,
} from "../config/currencies.js";

export type WorkshopStatus =
  | "draft"
  | "published"
  | "completed"
  | "cancelled";

export type WorkshopType =
  | "workshop"
  | "seminar";

export interface IWorkshopTicketType {
  code: string;
  name: string;
  description?: string;

  attendeeCount: number;

  pricing: Map<
    Currency,
    mongoose.Types.Decimal128
  >;

  isActive: boolean;
}

export interface IWorkshop
  extends Document {
  title: string;
  slug: string;
  type: WorkshopType;

  description: string;
  shortDescription?: string;

  startDate: Date;
  endDate?: Date;

  startTime?: string;
  endTime?: string;

  location?: string;
  isOnline: boolean;
  meetingLink?: string;

  capacity?: number;
  reservedCapacity: number;

  registrationRequired: boolean;
  registrationDeadline?: Date;

  ticketTypes: IWorkshopTicketType[];

  status: WorkshopStatus;

  featuredImage?: string;

  createdAt: Date;
  updatedAt: Date;
}

const TIME_REGEX =
  /^([01]\d|2[0-3]):([0-5]\d)$/;

const ticketTypeSchema =
  new Schema<IWorkshopTicketType>(
    {
      code: {
        type: String,
        required: [
          true,
          "Ticket type code is required.",
        ],
        trim: true,
        lowercase: true,
        maxlength: 50,
      },

      name: {
        type: String,
        required: [
          true,
          "Ticket type name is required.",
        ],
        trim: true,
        maxlength: 150,
      },

      description: {
        type: String,
        trim: true,
        maxlength: 500,
      },

      attendeeCount: {
        type: Number,
        required: [
          true,
          "Ticket attendee count is required.",
        ],
        min: [
          1,
          "Ticket attendee count must be at least 1.",
        ],
        validate: {
          validator: (value: number) =>
            Number.isInteger(value),
          message:
            "Ticket attendee count must be a whole number.",
        },
      },

      pricing: {
        type: Map,
        of: {
          type: Schema.Types.Decimal128,
          min: [
            0.01,
            "Ticket price must be greater than zero.",
          ],
        },
        required: [
          true,
          "Ticket pricing is required.",
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
            "Ticket pricing contains an unsupported currency.",
        },
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

const workshopSchema =
  new Schema<IWorkshop>(
    {
      title: {
        type: String,
        required: [
          true,
          "Workshop title is required.",
        ],
        trim: true,
        maxlength: 200,
      },

      slug: {
        type: String,
        required: [
          true,
          "Workshop slug is required.",
        ],
        unique: true,
        lowercase: true,
        trim: true,
        maxlength: 250,
      },

      type: {
        type: String,
        enum: [
          "workshop",
          "seminar",
        ],
        required: true,
      },

      description: {
        type: String,
        required: [
          true,
          "Workshop description is required.",
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
          "Workshop start date is required.",
        ],
      },

      endDate: {
        type: Date,
      },

      startTime: {
        type: String,
        trim: true,
        match: [
          TIME_REGEX,
          "Start time must be in HH:mm format.",
        ],
      },

      endTime: {
        type: String,
        trim: true,
        match: [
          TIME_REGEX,
          "End time must be in HH:mm format.",
        ],
      },

      location: {
        type: String,
        trim: true,
        maxlength: 500,
      },

      isOnline: {
        type: Boolean,
        default: false,
      },

      meetingLink: {
        type: String,
        trim: true,
        maxlength: 1000,
      },

      capacity: {
        type: Number,
        min: [
          1,
          "Workshop capacity must be at least 1.",
        ],
        validate: {
          validator: (value: number) =>
            Number.isInteger(value),
          message:
            "Workshop capacity must be a whole number.",
        },
      },

      reservedCapacity: {
        type: Number,
        required: true,
        default: 0,
        min: [
          0,
          "Reserved workshop capacity cannot be negative.",
        ],
        validate: {
          validator: (value: number) =>
            Number.isInteger(value),
          message:
            "Reserved workshop capacity must be a whole number.",
        },
      },

      registrationRequired: {
        type: Boolean,
        default: true,
      },

      registrationDeadline: {
        type: Date,
      },

      ticketTypes: {
        type: [ticketTypeSchema],
        required: [
          true,
          "At least one workshop ticket type is required.",
        ],
        validate: {
          validator: (
            value: IWorkshopTicketType[],
          ) => value.length > 0,
          message:
            "A workshop must have at least one ticket type.",
        },
      },

      status: {
        type: String,
        enum: [
          "draft",
          "published",
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

workshopSchema.pre(
  "validate",
  function () {
    if (
      this.endDate &&
      this.endDate < this.startDate
    ) {
      this.invalidate(
        "endDate",
        "End date must not be before start date.",
      );
    }

    if (
      this.startTime &&
      this.endTime &&
      this.startTime >= this.endTime
    ) {
      this.invalidate(
        "endTime",
        "End time must be later than start time.",
      );
    }

    if (
      this.isOnline &&
      this.location
    ) {
      this.invalidate(
        "location",
        "Online workshops should not have a physical location.",
      );
    }

    if (
      this.isOnline &&
      !this.meetingLink
    ) {
      this.invalidate(
        "meetingLink",
        "Online workshops must have a meeting link.",
      );
    }

    if (
      !this.isOnline &&
      !this.location
    ) {
      this.invalidate(
        "location",
        "Physical workshops must have a location.",
      );
    }

    if (
      this.registrationDeadline &&
      this.registrationDeadline >
        this.startDate
    ) {
      this.invalidate(
        "registrationDeadline",
        "Registration deadline must not be after the workshop start date.",
      );
    }

    if (
      this.registrationRequired &&
      this.status === "published" &&
      this.registrationDeadline &&
      this.registrationDeadline <= new Date()
    ) {
      this.invalidate(
        "registrationDeadline",
        "Registration deadline must be in the future for a published workshop.",
      );
    }

    if (
      typeof this.capacity === "number" &&
      this.reservedCapacity >
        this.capacity
    ) {
      this.invalidate(
        "reservedCapacity",
        "Reserved workshop capacity cannot exceed workshop capacity.",
      );
    }

    const ticketCodes =
      this.ticketTypes?.map(
        (ticket) => ticket.code,
      ) ?? [];

    if (
      new Set(ticketCodes).size !==
      ticketCodes.length
    ) {
      this.invalidate(
        "ticketTypes",
        "Workshop ticket type codes must be unique.",
      );
    }

    for (
      const ticket of this.ticketTypes ?? []
    ) {
      if (
        !ticket.pricing ||
        ticket.pricing.size === 0
      ) {
        this.invalidate(
          "ticketTypes",
          `Ticket type "${ticket.name}" must have at least one price.`,
        );
      }

      for (
        const currency of ticket.pricing.keys()
      ) {
        if (
          !(
            SUPPORTED_CURRENCIES as readonly string[]
          ).includes(currency)
        ) {
          this.invalidate(
            "ticketTypes",
            `Ticket type "${ticket.name}" contains unsupported currency "${currency}".`,
          );
        }
      }
    }
  },
);

workshopSchema.index({
  status: 1,
  startDate: 1,
});

workshopSchema.index({
  type: 1,
  status: 1,
});

export const Workshop =
  mongoose.model<IWorkshop>(
    "Workshop",
    workshopSchema,
  );