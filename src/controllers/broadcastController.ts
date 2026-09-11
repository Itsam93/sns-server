import type { Request, Response } from "express";

import {
  createBroadcast,
  getBroadcastById,
  getBroadcastRecipients,
  getBroadcasts,
} from "../services/broadcastService.js";

import {
  createBroadcastSchema,
} from "../utils/broadcastValidation.js";

import { AppError } from "../utils/appError.js";

export async function create(
  req: Request,
  res: Response,
) {
  if (!req.user) {
    throw new AppError(
      "Authentication required.",
      401,
    );
  }

  if (req.user.role !== "admin") {
    throw new AppError(
      "Admin access required.",
      403,
    );
  }

  const input =
    createBroadcastSchema.parse(
      req.body,
    );

  const broadcast =
    await createBroadcast({
      input,
      createdBy: req.user.userId,
    });

  res.status(201).json({
    success: true,
    message:
      "Broadcast sent successfully.",
    data: broadcast,
  });
}

export async function getAll(
  req: Request,
  res: Response,
) {
  if (!req.user) {
    throw new AppError(
      "Authentication required.",
      401,
    );
  }

  if (req.user.role !== "admin") {
    throw new AppError(
      "Admin access required.",
      403,
    );
  }

  const broadcasts =
    await getBroadcasts();

  res.status(200).json({
    success: true,
    data: broadcasts,
  });
}

export async function getById(
  req: Request<{ id: string }>,
  res: Response,
) {
  if (!req.user) {
    throw new AppError(
      "Authentication required.",
      401,
    );
  }

  if (req.user.role !== "admin") {
    throw new AppError(
      "Admin access required.",
      403,
    );
  }

  const broadcast =
    await getBroadcastById(
      req.params.id,
    );

  res.status(200).json({
    success: true,
    data: broadcast,
  });
}

export async function getRecipients(
  req: Request<{ id: string }>,
  res: Response,
) {
  if (!req.user) {
    throw new AppError(
      "Authentication required.",
      401,
    );
  }

  if (req.user.role !== "admin") {
    throw new AppError(
      "Admin access required.",
      403,
    );
  }

  const recipients =
    await getBroadcastRecipients(
      req.params.id,
    );

  res.status(200).json({
    success: true,
    data: recipients,
  });
}