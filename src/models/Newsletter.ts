import { Schema, model } from "mongoose";

export interface INewsletter {
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

const newsletterSchema =
  new Schema<INewsletter>(
    {
      email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
      },
    },
    {
      timestamps: true,
    },
  );

const Newsletter = model<INewsletter>(
  "Newsletter",
  newsletterSchema,
);

export default Newsletter;