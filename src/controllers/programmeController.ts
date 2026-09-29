import type {
  Request,
  Response,
} from "express";

import {
  calculateGroupDiscount,
  calculateProgrammePrice,
  cancelProgramme,
  completeProgramme,
  createProgramme,
  deleteProgramme,
  getActiveProgrammes,
  getAllProgrammes,
  getAvailableCapacity,
  getProgrammeById,
  getProgrammeBySlug,
  getProgrammePricingOption,
  getPublishedProgrammes,
  publishProgramme,
  reserveProgrammeCapacity,
  releaseProgrammeCapacity,
  startProgramme,
  updateProgramme,
  updateProgrammeStatus,
} from "../services/programmeService.js";

import { AppError } from "../utils/appError.js";

function getProgrammeId(
  req: Request,
): string {
  const { id } = req.params;

  if (
    typeof id !== "string" ||
    !id.trim()
  ) {
    throw new AppError(
      "Programme ID is required.",
      400,
    );
  }

  return id.trim();
}

function getProgrammeSlug(
  req: Request,
): string {
  const { slug } = req.params;

  if (
    typeof slug !== "string" ||
    !slug.trim()
  ) {
    throw new AppError(
      "Programme slug is required.",
      400,
    );
  }

  return slug.trim();
}

function getParticipantCount(
  req: Request,
): number {
  const value =
    req.body?.participantCount;

  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1
  ) {
    throw new AppError(
      "Participant count must be a whole number greater than zero.",
      400,
    );
  }

  return value;
}

function getPricingOptionCode(
  req: Request,
):
  | "early_bird"
  | "standard"
  | "one_on_one" {
  const value =
    req.body?.pricingOptionCode;

  if (
    value !== "early_bird" &&
    value !== "standard" &&
    value !== "one_on_one"
  ) {
    throw new AppError(
      "A valid programme pricing option is required.",
      400,
    );
  }

  return value;
}

function getCurrency(
  req: Request,
): "NGN" | "USD" {
  const value =
    req.body?.currency;

  if (
    value !== "NGN" &&
    value !== "USD"
  ) {
    throw new AppError(
      "Currency must be NGN or USD.",
      400,
    );
  }

  return value;
}

function getStatus(
  req: Request,
):
  | "draft"
  | "published"
  | "ongoing"
  | "completed"
  | "cancelled" {
  const value =
    req.body?.status;

  if (
    value !== "draft" &&
    value !== "published" &&
    value !== "ongoing" &&
    value !== "completed" &&
    value !== "cancelled"
  ) {
    throw new AppError(
      "A valid programme status is required.",
      400,
    );
  }

  return value;
}

export async function create(
  req: Request,
  res: Response,
) {
  const programme =
    await createProgramme(
      req.body,
    );

  res.status(201).json({
    success: true,
    message:
      "Programme created successfully.",
    data: programme,
  });
}

export async function getPublished(
  _req: Request,
  res: Response,
) {
  const programmes =
    await getPublishedProgrammes();

  res.status(200).json({
    success: true,
    data: programmes,
  });
}

export async function getActive(
  _req: Request,
  res: Response,
) {
  const programmes =
    await getActiveProgrammes();

  res.status(200).json({
    success: true,
    data: programmes,
  });
}

export async function getAll(
  _req: Request,
  res: Response,
) {
  const programmes =
    await getAllProgrammes();

  res.status(200).json({
    success: true,
    data: programmes,
  });
}

export async function getOne(
  req: Request,
  res: Response,
) {
  const programmeId =
    getProgrammeId(req);

  const programme =
    await getProgrammeById(
      programmeId,
    );

  res.status(200).json({
    success: true,
    data: programme,
  });
}

export async function getBySlug(
  req: Request,
  res: Response,
) {
  const slug =
    getProgrammeSlug(req);

  const programme =
    await getProgrammeBySlug(
      slug,
    );

  res.status(200).json({
    success: true,
    data: programme,
  });
}

export async function update(
  req: Request,
  res: Response,
) {
  const programmeId =
    getProgrammeId(req);

  const programme =
    await updateProgramme(
      programmeId,
      req.body,
    );

  res.status(200).json({
    success: true,
    message:
      "Programme updated successfully.",
    data: programme,
  });
}

export async function updateStatus(
  req: Request,
  res: Response,
) {
  const programmeId =
    getProgrammeId(req);

  const status =
    getStatus(req);

  const programme =
    await updateProgrammeStatus(
      programmeId,
      status,
    );

  res.status(200).json({
    success: true,
    message:
      "Programme status updated successfully.",
    data: programme,
  });
}

export async function publish(
  req: Request,
  res: Response,
) {
  const programmeId =
    getProgrammeId(req);

  const programme =
    await publishProgramme(
      programmeId,
    );

  res.status(200).json({
    success: true,
    message:
      "Programme published successfully.",
    data: programme,
  });
}

export async function start(
  req: Request,
  res: Response,
) {
  const programmeId =
    getProgrammeId(req);

  const programme =
    await startProgramme(
      programmeId,
    );

  res.status(200).json({
    success: true,
    message:
      "Programme started successfully.",
    data: programme,
  });
}

export async function complete(
  req: Request,
  res: Response,
) {
  const programmeId =
    getProgrammeId(req);

  const programme =
    await completeProgramme(
      programmeId,
    );

  res.status(200).json({
    success: true,
    message:
      "Programme completed successfully.",
    data: programme,
  });
}

export async function cancel(
  req: Request,
  res: Response,
) {
  const programmeId =
    getProgrammeId(req);

  const programme =
    await cancelProgramme(
      programmeId,
    );

  res.status(200).json({
    success: true,
    message:
      "Programme cancelled successfully.",
    data: programme,
  });
}

export async function getPricingOption(
  req: Request,
  res: Response,
) {
  const programmeId =
    getProgrammeId(req);

  const pricingOptionCode =
    getPricingOptionCode(req);

  const currency =
    getCurrency(req);

  const pricing =
    await getProgrammePricingOption(
      programmeId,
      pricingOptionCode,
      currency,
    );

  res.status(200).json({
    success: true,
    data: pricing,
  });
}

export async function calculatePrice(
  req: Request,
  res: Response,
) {
  const programmeId =
    getProgrammeId(req);

  const pricingOptionCode =
    getPricingOptionCode(req);

  const currency =
    getCurrency(req);

  const participantCount =
    req.body?.participantCount ??
    1;

  if (
    typeof participantCount !==
      "number" ||
    !Number.isInteger(
      participantCount,
    ) ||
    participantCount < 1
  ) {
    throw new AppError(
      "Participant count must be a whole number greater than zero.",
      400,
    );
  }

  const pricing =
    await calculateProgrammePrice(
      programmeId,
      pricingOptionCode,
      currency,
      participantCount,
    );

  res.status(200).json({
    success: true,
    data: pricing,
  });
}

export async function calculateDiscount(
  req: Request,
  res: Response,
) {
  const programmeId =
    getProgrammeId(req);

  const participantCount =
    getParticipantCount(req);

  const discount =
    await calculateGroupDiscount(
      programmeId,
      participantCount,
    );

  res.status(200).json({
    success: true,
    data: discount,
  });
}

export async function getCapacity(
  req: Request,
  res: Response,
) {
  const programmeId =
    getProgrammeId(req);

  const capacity =
    await getAvailableCapacity(
      programmeId,
    );

  res.status(200).json({
    success: true,
    data: {
      availableCapacity:
        capacity,
    },
  });
}

export async function reserveCapacity(
  req: Request,
  res: Response,
) {
  const programmeId =
    getProgrammeId(req);

  const participantCount =
    getParticipantCount(req);

  const programme =
    await reserveProgrammeCapacity(
      programmeId,
      participantCount,
    );

  res.status(200).json({
    success: true,
    message:
      "Programme capacity reserved successfully.",
    data: programme,
  });
}

export async function releaseCapacity(
  req: Request,
  res: Response,
) {
  const programmeId =
    getProgrammeId(req);

  const participantCount =
    getParticipantCount(req);

  const programme =
    await releaseProgrammeCapacity(
      programmeId,
      participantCount,
    );

  res.status(200).json({
    success: true,
    message:
      "Programme capacity released successfully.",
    data: programme,
  });
}

export async function remove(
  req: Request,
  res: Response,
) {
  const programmeId =
    getProgrammeId(req);

  const result =
    await deleteProgramme(
      programmeId,
    );

  res.status(200).json({
    success: true,
    message:
      "Programme deleted successfully.",
    data: result,
  });
}