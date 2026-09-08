import type { Request, Response } from "express";

import {
  activateUser,
  deactivateUser,
  deleteUser,
  getActiveUsers,
  getAllUsers,
  getInactiveUsers,
  getUserById,
  getUsersByRole,
  updateUserRole,
  updateUserStatus,
} from "../services/userService.js";

function getUserId(
  req: Request,
) {
  const { id } = req.params;

  if (
    typeof id !== "string" ||
    !id.trim()
  ) {
    throw new Error(
      "User ID is required.",
    );
  }

  return id;
}

function getActorId(
  req: Request,
) {
  const userId =
    req.user?.userId;

  if (
    !userId ||
    !userId.trim()
  ) {
    throw new Error(
      "Authenticated user is required.",
    );
  }

  return userId;
}

export async function getAll(
  _req: Request,
  res: Response,
) {
  const users =
    await getAllUsers();

  res.status(200).json({
    success: true,
    data: users,
  });
}

export async function getOne(
  req: Request,
  res: Response,
) {
  const userId =
    getUserId(req);

  const user =
    await getUserById(
      userId,
    );

  res.status(200).json({
    success: true,
    data: user,
  });
}

export async function getByRole(
  req: Request,
  res: Response,
) {
  const { role } =
    req.params;

  if (
    typeof role !== "string" ||
    !role.trim()
  ) {
    throw new Error(
      "User role is required.",
    );
  }

  const users =
    await getUsersByRole(
      role as
        | "client"
        | "admin",
    );

  res.status(200).json({
    success: true,
    data: users,
  });
}

export async function getActive(
  _req: Request,
  res: Response,
) {
  const users =
    await getActiveUsers();

  res.status(200).json({
    success: true,
    data: users,
  });
}

export async function getInactive(
  _req: Request,
  res: Response,
) {
  const users =
    await getInactiveUsers();

  res.status(200).json({
    success: true,
    data: users,
  });
}

export async function updateRole(
  req: Request,
  res: Response,
) {
  const userId =
    getUserId(req);

  const user =
    await updateUserRole(
      userId,
      req.body,
      getActorId(req),
    );

  res.status(200).json({
    success: true,
    message:
      "User role updated successfully.",
    data: user,
  });
}

export async function updateStatus(
  req: Request,
  res: Response,
) {
  const userId =
    getUserId(req);

  const user =
    await updateUserStatus(
      userId,
      req.body.isActive,
      getActorId(req),
    );

  res.status(200).json({
    success: true,
    message:
      "User status updated successfully.",
    data: user,
  });
}

export async function activate(
  req: Request,
  res: Response,
) {
  const userId =
    getUserId(req);

  const user =
    await activateUser(
      userId,
      getActorId(req),
    );

  res.status(200).json({
    success: true,
    message:
      "User activated successfully.",
    data: user,
  });
}

export async function deactivate(
  req: Request,
  res: Response,
) {
  const userId =
    getUserId(req);

  const user =
    await deactivateUser(
      userId,
      getActorId(req),
    );

  res.status(200).json({
    success: true,
    message:
      "User deactivated successfully.",
    data: user,
  });
}

export async function remove(
  req: Request,
  res: Response,
) {
  const userId =
    getUserId(req);

  const result =
    await deleteUser(
      userId,
      getActorId(req),
    );

  res.status(200).json({
    success: true,
    message:
      "User deleted successfully.",
    data: result,
  });
}