import mongoose, { Document, Schema } from "mongoose";

export type PartnershipStatus =
  | "pending"
  | "reviewing"
  | "contacted"
  | "approved"
  | "declined"
  | "completed";

export interface IPartnershipRequest extends Document {
  organisationName: string;
  contactPerson: string;
  email: string;
  phone?: string;

  organisationType?: string;
  website?: string;

  partnershipInterest: string;
  message?: string;

  status: PartnershipStatus;
  adminNote?: string;

  createdAt: Date;
  updatedAt: Date;
}

const partnershipRequestSchema =
  new Schema<IPartnershipRequest>(
    {
      organisationName: {
        type: String,
        required: true,
        trim: true,
      },

      contactPerson: {
        type: String,
        required: true,
        trim: true,
      },

      email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
      },

      phone: {
        type: String,
        trim: true,
      },

      organisationType: {
        type: String,
        trim: true,
      },

      website: {
        type: String,
        trim: true,
      },

      partnershipInterest: {
        type: String,
        required: true,
        trim: true,
      },

      message: {
        type: String,
        trim: true,
      },

      status: {
        type: String,
        enum: [
          "pending",
          "reviewing",
          "contacted",
          "approved",
          "declined",
          "completed",
        ],
        default: "pending",
        index: true,
      },

      adminNote: {
        type: String,
        trim: true,
      },
    },
    {
      timestamps: true,
    },
  );

export const PartnershipRequest =
  mongoose.model<IPartnershipRequest>(
    "PartnershipRequest",
    partnershipRequestSchema,
  );