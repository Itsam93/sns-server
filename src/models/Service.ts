import mongoose, { Document, Schema } from "mongoose";

export interface IService extends Document {
  name: string;
  slug: string;
  description: string;

  durationMinutes: number;

  price?: number;
  currency: string;

  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const serviceSchema = new Schema<IService>(
  {
    name: {
      type: String,
      required: [true, "Service name is required"],
      trim: true,
    },

    slug: {
      type: String,
      required: [true, "Service slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    description: {
      type: String,
      required: [true, "Service description is required"],
      trim: true,
    },

    durationMinutes: {
      type: Number,
      required: [true, "Service duration is required"],
      min: 15,
    },

    price: {
      type: Number,
      min: 0,
    },

    currency: {
      type: String,
      default: "NGN",
      uppercase: true,
      trim: true,
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

export const Service = mongoose.model<IService>(
  "Service",
  serviceSchema,
);