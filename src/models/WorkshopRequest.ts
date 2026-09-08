import mongoose, {
  Document,
  Schema,
} from "mongoose";

export type WorkshopRequestStatus =
  | "pending"
  | "reviewing"
  | "approved"
  | "rejected"
  | "completed"
  | "cancelled";

export type WorkshopRequesterType =
  | "individual"
  | "organisation";

export interface IWorkshopRequest
  extends Document {
  requesterType: WorkshopRequesterType;

  fullName: string;
  email: string;
  phone?: string;

  organisationName?: string;

  proposedTitle: string;
  description: string;

  preferredDate?: Date;

  expectedParticipants?: number;

  location?: string;
  isOnline: boolean;

  additionalInformation?: string;

  status: WorkshopRequestStatus;

  adminNote?: string;

  reviewedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const workshopRequestSchema =
  new Schema<IWorkshopRequest>(
    {
      requesterType: {
        type: String,
        enum: [
          "individual",
          "organisation",
        ],
        required: true,
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

      proposedTitle: {
        type: String,
        required: [
          true,
          "Proposed workshop title is required.",
        ],
        trim: true,
        maxlength: 200,
      },

      description: {
        type: String,
        required: [
          true,
          "Workshop description is required.",
        ],
        trim: true,
        maxlength: 5000,
      },

      preferredDate: {
        type: Date,
      },

      expectedParticipants: {
        type: Number,
        min: 1,
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

      additionalInformation: {
        type: String,
        trim: true,
        maxlength: 5000,
      },

      status: {
        type: String,
        enum: [
          "pending",
          "reviewing",
          "approved",
          "rejected",
          "completed",
          "cancelled",
        ],
        default: "pending",
        required: true,
        index: true,
      },

      adminNote: {
        type: String,
        trim: true,
        maxlength: 3000,
      },

      reviewedAt: {
        type: Date,
      },
    },
    {
      timestamps: true,
    },
  );

workshopRequestSchema.pre(
  "validate",
  function () {
    if (
      this.requesterType ===
        "organisation" &&
      !this.organisationName?.trim()
    ) {
      this.invalidate(
        "organisationName",
        "Organisation name is required for organisation requests.",
      );
    }

    if (
      this.preferredDate &&
      this.preferredDate < new Date()
    ) {
      this.invalidate(
        "preferredDate",
        "Preferred date cannot be in the past.",
      );
    }
  },
);

workshopRequestSchema.index({
  email: 1,
  createdAt: -1,
});

workshopRequestSchema.index({
  status: 1,
  createdAt: -1,
});

workshopRequestSchema.index({
  preferredDate: 1,
  status: 1,
});

export const WorkshopRequest =
  mongoose.model<IWorkshopRequest>(
    "WorkshopRequest",
    workshopRequestSchema,
  );