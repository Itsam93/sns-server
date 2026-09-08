import type { Request, Response } from "express";

import {
  createAvailability,
  deleteAvailability,
  getActiveAvailability,
  getAvailability,
  getAvailabilityById,
  updateAvailability,
} from "../services/availabilityService.js";

function getAvailabilityId(req: Request) {
  const { id } = req.params;

  if (typeof id !== "string" || !id) {
    throw new Error(
      "Availability ID is required.",
    );
  }

  return id;
}

export async function getAll(
  _req: Request,
  res: Response,
) {
  const availability =
    await getAvailability();

  res.status(200).json({
    success: true,
    data: availability,
  });
}

export async function getActive(
  _req: Request,
  res: Response,
) {
  const availability =
    await getActiveAvailability();

  res.status(200).json({
    success: true,
    data: availability,
  });
}

export async function getOne(
  req: Request,
  res: Response,
) {
  const availability =
    await getAvailabilityById(
      getAvailabilityId(req),
    );

  res.status(200).json({
    success: true,
    data: availability,
  });
}

export async function create(
  req: Request,
  res: Response,
) {
  const availability =
    await createAvailability(req.body);

  res.status(201).json({
    success: true,
    message:
      "Availability created successfully.",
    data: availability,
  });
}

export async function update(
  req: Request,
  res: Response,
) {
  const availability =
    await updateAvailability(
      getAvailabilityId(req),
      req.body,
    );

  res.status(200).json({
    success: true,
    message:
      "Availability updated successfully.",
    data: availability,
  });
}

export async function remove(
  req: Request,
  res: Response,
) {
  await deleteAvailability(
    getAvailabilityId(req),
  );

  res.status(200).json({
    success: true,
    message:
      "Availability deleted successfully.",
  });
}