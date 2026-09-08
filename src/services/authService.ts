import { Client } from "../models/Client.js";
import { User } from "../models/User.js";
import { AppError } from "../utils/appError.js";
import {
  comparePassword,
  hashPassword,
} from "../utils/password.js";
import { signAccessToken } from "../utils/jwt.js";

type RegisterInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
};

export async function registerClient(input: RegisterInput) {
  const existingUser = await User.findOne({
    email: input.email,
  });

  if (existingUser) {
    throw new AppError(
      "An account with this email already exists.",
      409,
    );
  }

  const hashedPassword = await hashPassword(input.password);

  const user = await User.create({
    email: input.email,
    password: hashedPassword,
    role: "client",
  });

  try {
    const client = await Client.create({
      userId: user._id,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
    });

    return {
      user,
      client,
    };
  } catch (error) {
    await User.findByIdAndDelete(user._id);
    throw error;
  }
}

type LoginInput = {
  email: string;
  password: string;
};

export async function loginUser(input: LoginInput) {
  const user = await User.findOne({
    email: input.email,
  }).select("+password");

  if (!user) {
    throw new AppError("Invalid email or password.", 401);
  }

  if (!user.isActive) {
    throw new AppError("This account has been deactivated.", 403);
  }

  const passwordMatches = await comparePassword(
    input.password,
    user.password,
  );

  if (!passwordMatches) {
    throw new AppError("Invalid email or password.", 401);
  }

  user.lastLoginAt = new Date();
  await user.save();

  const accessToken = signAccessToken({
    userId: user._id.toString(),
    role: user.role,
  });

  return {
    user,
    accessToken,
  };
}

export async function getAuthenticatedUser(userId: string) {
  const user = await User.findById(userId);

  if (!user || !user.isActive) {
    throw new AppError("User account not found.", 401);
  }

  return user;
}