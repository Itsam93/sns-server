import mongoose, { Document, Schema } from "mongoose";

export interface IIntakeForm extends Document {
  clientId: mongoose.Types.ObjectId;

  reasonForCounselling?: string;
  counsellingGoals?: string;

  previousCounselling?: boolean;
  previousCounsellingDetails?: string;

  additionalInformation?: string;

  consentToTreatment: boolean;
  consentToDataProcessing: boolean;

  completedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const intakeFormSchema = new Schema<IIntakeForm>(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      unique: true,
      index: true,
    },

    reasonForCounselling: {
      type: String,
      trim: true,
    },

    counsellingGoals: {
      type: String,
      trim: true,
    },

    previousCounselling: {
      type: Boolean,
    },

    previousCounsellingDetails: {
      type: String,
      trim: true,
    },

    additionalInformation: {
      type: String,
      trim: true,
    },

    consentToTreatment: {
      type: Boolean,
      required: true,
    },

    consentToDataProcessing: {
      type: Boolean,
      required: true,
    },

    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

export const IntakeForm = mongoose.model<IIntakeForm>(
  "IntakeForm",
  intakeFormSchema,
);