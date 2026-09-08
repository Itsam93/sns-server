import mongoose, {
  Document,
  Schema,
} from "mongoose";

export type WorkshopStatus =
  | "draft"
  | "published"
  | "completed"
  | "cancelled";

export type WorkshopType =
  | "workshop"
  | "seminar";

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

  registrationRequired: boolean;
  registrationDeadline?: Date;

  status: WorkshopStatus;

  featuredImage?: string;

  createdAt: Date;
  updatedAt: Date;
}

const TIME_REGEX =
  /^([01]\d|2[0-3]):([0-5]\d)$/;

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
        min: 1,
      },

      registrationRequired: {
        type: Boolean,
        default: true,
      },

      registrationDeadline: {
        type: Date,
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
      this.status === "published" &&
      this.registrationRequired &&
      this.registrationDeadline &&
      this.registrationDeadline >
        this.startDate
    ) {
      this.invalidate(
        "registrationDeadline",
        "Registration deadline must not be after the workshop start date.",
      );
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