import mongoose, {
  Document,
  Schema,
} from "mongoose";

export type UserRole =
  | "client"
  | "admin";

export interface IUser extends Document {
  email: string;
  password: string;
  role: UserRole;

  isEmailVerified: boolean;
  emailVerificationTokenHash?: string;
  emailVerificationExpiresAt?: Date;
  emailVerifiedAt?: Date;

  passwordResetTokenHash?: string;
  passwordResetExpiresAt?: Date;

  isActive: boolean;
  lastLoginAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const userSchema =
  new Schema<IUser>(
    {
      email: {
        type: String,
        required: [
          true,
          "Email is required",
        ],
        unique: true,
        lowercase: true,
        trim: true,
      },

      password: {
        type: String,
        required: [
          true,
          "Password is required",
        ],
        select: false,
      },

      role: {
        type: String,
        enum: [
          "client",
          "admin",
        ],
        default: "client",
        required: true,
      },

      isEmailVerified: {
        type: Boolean,
        default: false,
      },

      emailVerificationTokenHash: {
        type: String,
        select: false,
      },

      emailVerificationExpiresAt: {
        type: Date,
        select: false,
      },

      emailVerifiedAt: {
        type: Date,
      },

      passwordResetTokenHash: {
        type: String,
        select: false,
      },

      passwordResetExpiresAt: {
        type: Date,
        select: false,
      },

      isActive: {
        type: Boolean,
        default: true,
      },

      lastLoginAt: {
        type: Date,
      },
    },
    {
      timestamps: true,
      strict: true,
      strictQuery: true,
    },
  );

export const User =
  mongoose.model<IUser>(
    "User",
    userSchema,
  );