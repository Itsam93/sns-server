import type { Request, Response } from "express";

import {
  createWorkshopRequest,
  deleteWorkshopRequest,
  getWorkshopRequestById,
  getWorkshopRequests,
  getWorkshopRequestsByStatus,
  updateWorkshopRequest,
} from "../services/workshopRequestService.js";

function getRequestId(req: Request) {
  const { id } = req.params;

  if (
    typeof id !== "string" ||
    !id.trim()
  ) {
    throw new Error(
      "Workshop request ID is required.",
    );
  }

  return id;
}

export async function create(
  req: Request,
  res: Response,
) {
  const request =
    await createWorkshopRequest(
      req.body,
    );

  res.status(201).json({
    success: true,
    message:
      "Workshop request submitted successfully.",
    data: request,
  });
}

export async function getAll(
  _req: Request,
  res: Response,
) {
  const requests =
    await getWorkshopRequests();

  res.status(200).json({
    success: true,
    data: requests,
  });
}

export async function getByStatus(
  req: Request,
  res: Response,
) {
  const { status } = req.params;

  if (
    typeof status !== "string" ||
    !status.trim()
  ) {
    throw new Error(
      "Workshop request status is required.",
    );
  }

  const requests =
    await getWorkshopRequestsByStatus(
      status as
        | "pending"
        | "reviewing"
        | "approved"
        | "rejected"
        | "completed"
        | "cancelled",
    );

  res.status(200).json({
    success: true,
    data: requests,
  });
}

export async function getOne(
  req: Request,
  res: Response,
) {
  const requestId =
    getRequestId(req);

  const request =
    await getWorkshopRequestById(
      requestId,
    );

  res.status(200).json({
    success: true,
    data: request,
  });
}

export async function update(
  req: Request,
  res: Response,
) {
  const requestId =
    getRequestId(req);

  const request =
    await updateWorkshopRequest(
      requestId,
      req.body,
    );

  res.status(200).json({
    success: true,
    message:
      "Workshop request updated successfully.",
    data: request,
  });
}

export async function remove(
  req: Request,
  res: Response,
) {
  const requestId =
    getRequestId(req);

  const result =
    await deleteWorkshopRequest(
      requestId,
    );

  res.status(200).json({
    success: true,
    message:
      "Workshop request deleted successfully.",
    data: result,
  });
}