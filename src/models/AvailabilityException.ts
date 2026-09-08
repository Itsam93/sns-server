import mongoose, {
  Document,
  Schema,
} from "mongoose";

export type AvailabilityExceptionType =
  | "blocked"
  | "custom";

export interface IAvailabilityException
  extends Document {
  date: Date;
  type: AvailabilityExceptionType;
  startTime?: string;
  endTime?: string;
  reason?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TIME_REGEX =
  /^([01]\d|2[0-3]):([0-5]\d)$/;

const availabilityExceptionSchema =
  new Schema<IAvailabilityException>(
    {
      date: {
        type: Date,
        required: [
          true,
          "Exception date is required",
        ],
      },

      type: {
        type: String,
        enum: [
          "blocked",
          "custom",
        ],
        required: [
          true,
          "Exception type is required",
        ],
      },

      startTime: {
        type: String,
        trim: true,
        match: [
          TIME_REGEX,
          "Start time must be in HH:mm format",
        ],
      },

      endTime: {
        type: String,
        trim: true,
        match: [
          TIME_REGEX,
          "End time must be in HH:mm format",
        ],
      },

      reason: {
        type: String,
        trim: true,
        maxlength: 500,
      },

      isActive: {
        type: Boolean,
        default: true,
      },
    },
    {
      timestamps: true,
    },
  );

availabilityExceptionSchema.pre(
  "validate",
  function () {
    if (
      this.type === "custom" &&
      (!this.startTime ||
        !this.endTime)
    ) {
      this.invalidate(
        "startTime",
        "Start time and end time are required for custom availability.",
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
  },
);

availabilityExceptionSchema.index(
  {
    date: 1,
    isActive: 1,
  },
);

export const AvailabilityException =
  mongoose.model<IAvailabilityException>(
    "AvailabilityException",
    availabilityExceptionSchema,
  );