import mongoose from "mongoose";

import {
  WorkshopRequest,
  type WorkshopRequestStatus,
} from "../models/WorkshopRequest.js";
import { AppError } from "../utils/appError.js";

type CreateWorkshopRequestInput = {
  requesterType: "individual" | "organisation";
  fullName: string;
  email: string;
  phone?: string;
  organisationName?: string;
  proposedTitle: string;
  description: string;
  preferredDate?: Date;
  expectedParticipants?: number;
  location?: string;
  isOnline?: boolean;
  additionalInformation?: string;
};

type UpdateWorkshopRequestInput = {
  status: WorkshopRequestStatus;
  adminNote?: string;
};

const STATUS_TRANSITIONS: Record<
  WorkshopRequestStatus,
  WorkshopRequestStatus[]
> = {
  pending: ["reviewing", "approved", "rejected", "cancelled"],
  reviewing: ["approved", "rejected", "cancelled"],
  approved: ["completed", "cancelled"],
  rejected: [],
  completed: [],
  cancelled: [],
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

async function getRequestOrFail(
  requestId: string,
) {
  validateObjectId(
    requestId,
    "workshop request ID",
  );

  const request =
    await WorkshopRequest.findById(
      requestId,
    );

  if (!request) {
    throw new AppError(
      "Workshop request not found.",
      404,
    );
  }

  return request;
}

function validateRequestData(
  data: CreateWorkshopRequestInput,
) {
  if (
    data.requesterType ===
      "organisation" &&
    !data.organisationName?.trim()
  ) {
    throw new AppError(
      "Organisation name is required for organisation requests.",
      400,
    );
  }

  if (
    data.preferredDate &&
    data.preferredDate < new Date()
  ) {
    throw new AppError(
      "Preferred date cannot be in the past.",
      400,
    );
  }

  if (
    data.expectedParticipants !==
      undefined &&
    data.expectedParticipants < 1
  ) {
    throw new AppError(
      "Expected participants must be at least 1.",
      400,
    );
  }
}

export async function createWorkshopRequest(
  data: CreateWorkshopRequestInput,
) {
  validateRequestData(data);

  return WorkshopRequest.create({
    ...data,
    email: data.email.toLowerCase(),
    status: "pending",
  });
}

export async function getWorkshopRequests() {
  return WorkshopRequest.find().sort({
    createdAt: -1,
  });
}

export async function getWorkshopRequestById(
  requestId: string,
) {
  return getRequestOrFail(
    requestId,
  );
}

export async function getWorkshopRequestsByStatus(
  status: WorkshopRequestStatus,
) {
  return WorkshopRequest.find({
    status,
  }).sort({
    createdAt: -1,
  });
}

export async function updateWorkshopRequest(
  requestId: string,
  data: UpdateWorkshopRequestInput,
) {
  const request =
    await getRequestOrFail(
      requestId,
    );

  const currentStatus =
    request.status;

  if (
    currentStatus !== data.status
  ) {
    const allowedTransitions =
      STATUS_TRANSITIONS[
        currentStatus
      ];

    if (
      !allowedTransitions.includes(
        data.status,
      )
    ) {
      throw new AppError(
        `A workshop request cannot move from "${currentStatus}" to "${data.status}".`,
        400,
      );
    }
  }

  request.status =
    data.status;

  if (
    data.adminNote !==
    undefined
  ) {
    request.adminNote =
      data.adminNote;
  }

  if (
    currentStatus ===
      "pending" &&
    data.status !== "pending"
  ) {
    request.reviewedAt =
      new Date();
  }

  if (
    currentStatus ===
      "reviewing" &&
    data.status !== "reviewing"
  ) {
    request.reviewedAt =
      new Date();
  }

  await request.save();

  return request;
}

export async function deleteWorkshopRequest(
  requestId: string,
) {
  const request =
    await getRequestOrFail(
      requestId,
    );

  if (
    ![
      "rejected",
      "cancelled",
    ].includes(request.status)
  ) {
    throw new AppError(
      "Only rejected or cancelled workshop requests can be deleted.",
      409,
    );
  }

  await request.deleteOne();

  return {
    deleted: true,
    requestId,
  };
}