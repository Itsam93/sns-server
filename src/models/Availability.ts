import mongoose, {
  Document,
  Schema,
} from "mongoose";

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday";

export interface IAvailability
  extends Document {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TIME_REGEX =
  /^([01]\d|2[0-3]):([0-5]\d)$/;

const availabilitySchema =
  new Schema<IAvailability>(
    {
      dayOfWeek: {
        type: String,
        enum: [
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
        ],
        required: [
          true,
          "Day of week is required",
        ],
      },

      startTime: {
        type: String,
        required: [
          true,
          "Start time is required",
        ],
        trim: true,
        match: [
          TIME_REGEX,
          "Start time must be in HH:mm format",
        ],
      },

      endTime: {
        type: String,
        required: [
          true,
          "End time is required",
        ],
        trim: true,
        match: [
          TIME_REGEX,
          "End time must be in HH:mm format",
        ],
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

availabilitySchema.pre(
  "validate",
  function () {
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

availabilitySchema.index({
  dayOfWeek: 1,
  startTime: 1,
  endTime: 1,
});

export const Availability =
  mongoose.model<IAvailability>(
    "Availability",
    availabilitySchema,
  );