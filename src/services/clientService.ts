import mongoose from "mongoose";

import { Client } from "../models/Client.js";
import { User } from "../models/User.js";
import { AppError } from "../utils/appError.js";

type UpdateClientProfileInput = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: Date;
  preferredContactMethod?: "email" | "phone";
  profileImage?: string;
};

function validateObjectId(
  id: string,
  fieldName: string,
) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(
      `Invalid ${fieldName}.`,
      400,
    );
  }
}

export async function getMyProfile(
  userId: string,
) {
  validateObjectId(userId, "user ID");

  const client =
    await Client.findOne({
      userId,
    }).populate({
      path: "userId",
      select:
        "email role isEmailVerified isActive lastLoginAt createdAt",
    });

  if (!client) {
    throw new AppError(
      "Client profile not found.",
      404,
    );
  }

  return client;
}

export async function updateMyProfile(
  userId: string,
  data: UpdateClientProfileInput,
) {
  validateObjectId(userId, "user ID");

  const client =
    await Client.findOne({
      userId,
    });

  if (!client) {
    throw new AppError(
      "Client profile not found.",
      404,
    );
  }

  if (data.firstName !== undefined) {
    client.firstName =
      data.firstName;
  }

  if (data.lastName !== undefined) {
    client.lastName =
      data.lastName;
  }

  if (data.phone !== undefined) {
    client.phone = data.phone;
  }

  if (
    data.dateOfBirth !==
    undefined
  ) {
    client.dateOfBirth =
      data.dateOfBirth;
  }

  if (
    data.preferredContactMethod !==
    undefined
  ) {
    client.preferredContactMethod =
      data.preferredContactMethod;
  }

  if (
    data.profileImage !==
    undefined
  ) {
    client.profileImage =
      data.profileImage;
  }

  await client.save();

  return getMyProfile(userId);
}

export async function getClients() {
  return Client.find()
    .populate({
      path: "userId",
      select:
        "email role isEmailVerified isActive lastLoginAt createdAt",
    })
    .sort({
      lastName: 1,
      firstName: 1,
    });
}

export async function getClientById(
  clientId: string,
) {
  validateObjectId(
    clientId,
    "client ID",
  );

  const client =
    await Client.findById(
      clientId,
    ).populate({
      path: "userId",
      select:
        "email role isEmailVerified isActive lastLoginAt createdAt",
    });

  if (!client) {
    throw new AppError(
      "Client not found.",
      404,
    );
  }

  return client;
}

export async function updateClient(
  clientId: string,
  data: UpdateClientProfileInput,
) {
  validateObjectId(
    clientId,
    "client ID",
  );

  const client =
    await Client.findById(
      clientId,
    );

  if (!client) {
    throw new AppError(
      "Client not found.",
      404,
    );
  }

  if (data.firstName !== undefined) {
    client.firstName =
      data.firstName;
  }

  if (data.lastName !== undefined) {
    client.lastName =
      data.lastName;
  }

  if (data.phone !== undefined) {
    client.phone = data.phone;
  }

  if (
    data.dateOfBirth !==
    undefined
  ) {
    client.dateOfBirth =
      data.dateOfBirth;
  }

  if (
    data.preferredContactMethod !==
    undefined
  ) {
    client.preferredContactMethod =
      data.preferredContactMethod;
  }

  if (
    data.profileImage !==
    undefined
  ) {
    client.profileImage =
      data.profileImage;
  }

  await client.save();

  return getClientById(
    clientId,
  );
}

export async function updateClientStatus(
  clientId: string,
  isActive: boolean,
) {
  validateObjectId(
    clientId,
    "client ID",
  );

  const client =
    await Client.findById(
      clientId,
    );

  if (!client) {
    throw new AppError(
      "Client not found.",
      404,
    );
  }

  const user =
    await User.findById(
      client.userId,
    );

  if (!user) {
    throw new AppError(
      "Associated user account not found.",
      404,
    );
  }

  user.isActive =
    isActive;

  await user.save();

  return getClientById(
    clientId,
  );
}