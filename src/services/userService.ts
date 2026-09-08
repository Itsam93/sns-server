import mongoose from "mongoose";

import {
  User,
  type UserRole,
} from "../models/User.js";
import { AppError } from "../utils/appError.js";

type UpdateUserRoleInput = {
  role: UserRole;
};

const USER_ROLES: UserRole[] = [
  "client",
  "admin",
];

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

function validateRole(
  role: UserRole,
) {
  if (
    !USER_ROLES.includes(role)
  ) {
    throw new AppError(
      "Invalid user role.",
      400,
    );
  }
}

async function getUserOrFail(
  userId: string,
) {
  validateObjectId(
    userId,
    "user ID",
  );

  const user =
    await User.findById(
      userId,
    );

  if (!user) {
    throw new AppError(
      "User not found.",
      404,
    );
  }

  return user;
}

export async function getAllUsers() {
  return User.find()
    .select(
      "-password",
    )
    .sort({
      createdAt: -1,
    });
}

export async function getUserById(
  userId: string,
) {
  const user =
    await getUserOrFail(
      userId,
    );

  return user;
}

export async function getUsersByRole(
  role: UserRole,
) {
  validateRole(role);

  return User.find({
    role,
  })
    .select(
      "-password",
    )
    .sort({
      createdAt: -1,
    });
}

export async function getActiveUsers() {
  return User.find({
    isActive: true,
  })
    .select(
      "-password",
    )
    .sort({
      createdAt: -1,
    });
}

export async function getInactiveUsers() {
  return User.find({
    isActive: false,
  })
    .select(
      "-password",
    )
    .sort({
      createdAt: -1,
    });
}

export async function updateUserRole(
  userId: string,
  data: UpdateUserRoleInput,
  actorId?: string,
) {
  const user =
    await getUserOrFail(
      userId,
    );

  validateRole(
    data.role,
  );

  if (
    actorId &&
    user._id.toString() ===
      actorId &&
    user.role !== data.role
  ) {
    throw new AppError(
      "You cannot change your own administrator role.",
      403,
    );
  }

  if (
    user.role ===
    data.role
  ) {
    return user;
  }

  user.role =
    data.role;

  await user.save();

  return user;
}

export async function updateUserStatus(
  userId: string,
  isActive: boolean,
  actorId?: string,
) {
  const user =
    await getUserOrFail(
      userId,
    );

  if (
    actorId &&
    user._id.toString() ===
      actorId &&
    !isActive
  ) {
    throw new AppError(
      "You cannot deactivate your own account.",
      403,
    );
  }

  if (
    user.isActive ===
    isActive
  ) {
    return user;
  }

  user.isActive =
    isActive;

  await user.save();

  return user;
}

export async function activateUser(
  userId: string,
  actorId?: string,
) {
  return updateUserStatus(
    userId,
    true,
    actorId,
  );
}

export async function deactivateUser(
  userId: string,
  actorId?: string,
) {
  return updateUserStatus(
    userId,
    false,
    actorId,
  );
}

export async function deleteUser(
  userId: string,
  actorId?: string,
) {
  const user =
    await getUserOrFail(
      userId,
    );

  if (
    actorId &&
    user._id.toString() ===
      actorId
  ) {
    throw new AppError(
      "You cannot delete your own account.",
      403,
    );
  }

  if (
    user.role ===
      "admin" &&
    user.isActive
  ) {
    throw new AppError(
      "An active administrator cannot be deleted. Deactivate the account first.",
      409,
    );
  }

  await user.deleteOne();

  return {
    deleted: true,
    userId,
  };
}