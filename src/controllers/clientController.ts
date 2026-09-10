import type { Request, Response } from "express";

import {
  getMyProfile,
  updateMyProfile,
  getClients,
  getClientById,
  updateClient,
  updateClientStatus,
} from "../services/clientService.js";

import { AppError } from "../utils/appError.js";

function getAuthenticatedUserId(
  req: Request,
): string {
  const userId = req.user?.userId;

  if (!userId) {
    throw new AppError(
      "Authentication required.",
      401,
    );
  }

  return userId;
}

function getClientId(
  req: Request,
): string {
  const clientId = req.params.id;

  if (
    typeof clientId !== "string" ||
    clientId.length === 0
  ) {
    throw new AppError(
      "Client ID is required.",
      400,
    );
  }

  return clientId;
}

/*
 * Client
 */

export async function getMine(
  req: Request,
  res: Response,
) {
  const userId =
    getAuthenticatedUserId(req);

  const client =
    await getMyProfile(userId);

  res.status(200).json({
    success: true,
    data: client,
  });
}

export async function updateMine(
  req: Request,
  res: Response,
) {
  const userId =
    getAuthenticatedUserId(req);

  const client =
    await updateMyProfile(
      userId,
      req.body,
    );

  res.status(200).json({
    success: true,
    message:
      "Profile updated successfully.",
    data: client,
  });
}

/*
 * Admin
 */

export async function getAll(
  _req: Request,
  res: Response,
) {
  const clients =
    await getClients();

  res.status(200).json({
    success: true,
    data: clients,
  });
}

export async function getOne(
  req: Request,
  res: Response,
) {
  const clientId =
    getClientId(req);

  const client =
    await getClientById(clientId);

  res.status(200).json({
    success: true,
    data: client,
  });
}

export async function update(
  req: Request,
  res: Response,
) {
  const clientId =
    getClientId(req);

  const client =
    await updateClient(
      clientId,
      req.body,
    );

  res.status(200).json({
    success: true,
    message:
      "Client profile updated successfully.",
    data: client,
  });
}

export async function updateStatus(
  req: Request,
  res: Response,
) {
  const clientId =
    getClientId(req);

  const client =
    await updateClientStatus(
      clientId,
      req.body.isActive,
    );

  res.status(200).json({
    success: true,
    message: req.body.isActive
      ? "Client account activated successfully."
      : "Client account deactivated successfully.",
    data: client,
  });
}