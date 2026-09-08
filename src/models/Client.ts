import mongoose, {
  Document,
  Schema,
} from "mongoose";

export type ContactMethod =
  | "email"
  | "phone";

export interface IClient
  extends Document {
  userId: mongoose.Types.ObjectId;

  firstName: string;
  lastName: string;

  phone?: string;
  dateOfBirth?: Date;

  preferredContactMethod: ContactMethod;

  profileImage?: string;

  createdAt: Date;
  updatedAt: Date;
}

const clientSchema =
  new Schema<IClient>(
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: [
          true,
          "User is required",
        ],
        unique: true,
        index: true,
      },

      firstName: {
        type: String,
        required: [
          true,
          "First name is required",
        ],
        trim: true,
        maxlength: 100,
      },

      lastName: {
        type: String,
        required: [
          true,
          "Last name is required",
        ],
        trim: true,
        maxlength: 100,
      },

      phone: {
        type: String,
        trim: true,
        maxlength: 30,
      },

      dateOfBirth: {
        type: Date,
      },

      preferredContactMethod: {
        type: String,
        enum: [
          "email",
          "phone",
        ],
        default: "email",
        required: true,
      },

      profileImage: {
        type: String,
        trim: true,
        maxlength: 1000,
      },
    },
    {
      timestamps: true,
    },
  );

clientSchema.index({
  lastName: 1,
  firstName: 1,
});

export const Client =
  mongoose.model<IClient>(
    "Client",
    clientSchema,
  );