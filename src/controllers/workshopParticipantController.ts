import type { Request, Response } from "express";

import {
  cancelParticipant,
  deleteParticipant,
  getParticipantById,
  getWorkshopParticipantCount,
  getWorkshopParticipants,
  registerParticipant,
  updateParticipantStatus,
} from "../services/workshopParticipantService.js";

function getWorkshopId(req: Request) {
  const { workshopId } = req.params;

  if (
    typeof workshopId !== "string" ||
    !workshopId.trim()
  ) {
    throw new Error(
      "Workshop ID is required.",
    );
  }

  return workshopId;
}

function getParticipantId(req: Request) {
  const { id } = req.params;

  if (
    typeof id !== "string" ||
    !id.trim()
  ) {
    throw new Error(
      "Participant ID is required.",
    );
  }

  return id;
}

export async function register(
  req: Request,
  res: Response,
) {
  const workshopId =
    getWorkshopId(req);

  const participant =
    await registerParticipant(
      workshopId,
      req.body,
    );

  res.status(201).json({
    success: true,
    message:
      "Registration completed successfully.",
    data: participant,
  });
}

export async function getAll(
  req: Request,
  res: Response,
) {
  const workshopId =
    getWorkshopId(req);

  const participants =
    await getWorkshopParticipants(
      workshopId,
    );

  res.status(200).json({
    success: true,
    data: participants,
  });
}

export async function getOne(
  req: Request,
  res: Response,
) {
  const participantId =
    getParticipantId(req);

  const participant =
    await getParticipantById(
      participantId,
    );

  res.status(200).json({
    success: true,
    data: participant,
  });
}

export async function getCount(
  req: Request,
  res: Response,
) {
  const workshopId =
    getWorkshopId(req);

  const count =
    await getWorkshopParticipantCount(
      workshopId,
    );

  res.status(200).json({
    success: true,
    data: count,
  });
}

export async function updateStatus(
  req: Request,
  res: Response,
) {
  const participantId =
    getParticipantId(req);

  const participant =
    await updateParticipantStatus(
      participantId,
      req.body.status,
    );

  res.status(200).json({
    success: true,
    message:
      "Participant status updated successfully.",
    data: participant,
  });
}

export async function cancel(
  req: Request,
  res: Response,
) {
  const participantId =
    getParticipantId(req);

  const participant =
    await cancelParticipant(
      participantId,
    );

  res.status(200).json({
    success: true,
    message:
      "Participant registration cancelled successfully.",
    data: participant,
  });
}

export async function remove(
  req: Request,
  res: Response,
) {
  const participantId =
    getParticipantId(req);

  const result =
    await deleteParticipant(
      participantId,
    );

  res.status(200).json({
    success: true,
    message:
      "Participant deleted successfully.",
    data: result,
  });
}