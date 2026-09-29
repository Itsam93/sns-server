import mongoose, {
  Document,
  Schema,
} from "mongoose";

export type WorkshopParticipantStatus =
  | "registered"
  | "attended"
  | "cancelled"
  | "no_show";

export interface IWorkshopParticipant
  extends Document {
  workshopId: mongoose.Types.ObjectId;

  fullName: string;
  email: string;
  phone?: string;

  organisationName?: string;

  status: WorkshopParticipantStatus;

  registeredAt: Date;
  attendedAt?: Date;
  cancelledAt?: Date;
  noShowAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const workshopParticipantSchema =
  new Schema<IWorkshopParticipant>(
    {
      workshopId: {
        type: Schema.Types.ObjectId,
        ref: "Workshop",
        required: true,
        index: true,
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
        lowercase: true,
        trim: true,
        maxlength: 320,
      },

      phone: {
        type: String,
        trim: true,
        maxlength: 30,
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
          "no_show",
        ],
        default: "registered",
        required: true,
        index: true,
      },

      registeredAt: {
        type: Date,
        default: Date.now,
        required: true,
      },

      attendedAt: {
        type: Date,
      },

      cancelledAt: {
        type: Date,
      },

      noShowAt: {
        type: Date,
      },
    },
    {
      timestamps: true,
      strict: true,
      strictQuery: true,
    },
  );

workshopParticipantSchema.pre(
  "validate",
  function () {
    if (
      this.status === "attended" &&
      !this.attendedAt
    ) {
      this.invalidate(
        "attendedAt",
        "Attended participants must have an attendance timestamp.",
      );
    }

    if (
      this.status === "cancelled" &&
      !this.cancelledAt
    ) {
      this.invalidate(
        "cancelledAt",
        "Cancelled participants must have a cancellation timestamp.",
      );
    }

    if (
      this.status === "no_show" &&
      !this.noShowAt
    ) {
      this.invalidate(
        "noShowAt",
        "No-show participants must have a no-show timestamp.",
      );
    }

    if (
      this.status !== "attended" &&
      this.attendedAt
    ) {
      this.invalidate(
        "attendedAt",
        "Only attended participants can have an attendance timestamp.",
      );
    }

    if (
      this.status !== "cancelled" &&
      this.cancelledAt
    ) {
      this.invalidate(
        "cancelledAt",
        "Only cancelled participants can have a cancellation timestamp.",
      );
    }

    if (
      this.status !== "no_show" &&
      this.noShowAt
    ) {
      this.invalidate(
        "noShowAt",
        "Only no-show participants can have a no-show timestamp.",
      );
    }
  },
);

workshopParticipantSchema.index(
  {
    workshopId: 1,
    email: 1,
  },
  {
    unique: true,
    name: "unique_workshop_participant_email",
  },
);

workshopParticipantSchema.index(
  {
    workshopId: 1,
    status: 1,
  },
);

workshopParticipantSchema.index(
  {
    email: 1,
    createdAt: -1,
  },
);

export const WorkshopParticipant =
  mongoose.model<IWorkshopParticipant>(
    "WorkshopParticipant",
    workshopParticipantSchema,
  );