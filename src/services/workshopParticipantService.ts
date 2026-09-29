import mongoose from "mongoose";

import {
  Workshop,
  type IWorkshop,
} from "../models/Workshop.js";
import {
  WorkshopParticipant,
  type WorkshopParticipantStatus,
} from "../models/WorkshopParticipant.js";
import { AppError } from "../utils/appError.js";

type CreateWorkshopParticipantInput = {
  fullName: string;
  email: string;
  phone?: string;
  organisationName?: string;
};

type RegisterParticipantOptions = {
  allowPostPaymentFulfilment?: boolean;
};

const ACTIVE_PARTICIPANT_STATUSES: WorkshopParticipantStatus[] = [
  "registered",
  "attended",
];

function validateObjectId(
  id: string,
  fieldName: string,
): void {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(
      `Invalid ${fieldName}.`,
      400,
    );
  }
}

async function getWorkshopOrFail(
  workshopId: string,
): Promise<IWorkshop> {
  validateObjectId(
    workshopId,
    "workshop ID",
  );

  const workshop =
    await Workshop.findById(workshopId);

  if (!workshop) {
    throw new AppError(
      "Workshop not found.",
      404,
    );
  }

  return workshop;
}

async function getParticipantOrFail(
  participantId: string,
) {
  validateObjectId(
    participantId,
    "participant ID",
  );

  const participant =
    await WorkshopParticipant.findById(
      participantId,
    );

  if (!participant) {
    throw new AppError(
      "Workshop participant not found.",
      404,
    );
  }

  return participant;
}

function validateRegistrationEligibility(
  workshop: IWorkshop,
): void {
  if (workshop.status !== "published") {
    throw new AppError(
      "Registration is not available for this workshop.",
      409,
    );
  }

  if (!workshop.registrationRequired) {
    throw new AppError(
      "Registration is not required for this workshop.",
      409,
    );
  }

  const now = new Date();

  if (workshop.startDate <= now) {
    throw new AppError(
      "Registration is closed because the workshop has already started.",
      409,
    );
  }

  if (
    workshop.registrationDeadline &&
    workshop.registrationDeadline < now
  ) {
    throw new AppError(
      "Registration for this workshop has closed.",
      409,
    );
  }
}

function normalizeParticipantEmail(
  email: string,
): string {
  const normalized = email
    .trim()
    .toLowerCase();

  if (
    !normalized ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      normalized,
    )
  ) {
    throw new AppError(
      "A valid email address is required.",
      400,
    );
  }

  return normalized;
}

function normalizeParticipantName(
  fullName: string,
): string {
  const normalized = fullName.trim();

  if (!normalized) {
    throw new AppError(
      "Full name is required.",
      400,
    );
  }

  return normalized;
}

function normalizeOptionalParticipantString(
  value: string | undefined,
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();

  return normalized || undefined;
}

function isDuplicateKeyError(
  error: unknown,
): boolean {
  return (
    error instanceof mongoose.Error &&
    "code" in error &&
    error.code === 11000
  );
}

async function getActiveParticipantCount(
  workshopId: mongoose.Types.ObjectId,
): Promise<number> {
  return WorkshopParticipant.countDocuments({
    workshopId,
    status: {
      $in: ACTIVE_PARTICIPANT_STATUSES,
    },
  });
}

async function ensureWorkshopHasCapacity(
  workshop: IWorkshop,
): Promise<void> {
  if (workshop.capacity === undefined) {
    return;
  }

  const participantCount =
    await getActiveParticipantCount(
      workshop._id,
    );

  if (
    participantCount >=
    workshop.capacity
  ) {
    throw new AppError(
      "This workshop has reached its registration capacity.",
      409,
    );
  }
}

async function restoreCancelledParticipant(
  participant: Awaited<
    ReturnType<
      typeof getParticipantOrFail
    >
  >,
  workshop: IWorkshop,
  data: CreateWorkshopParticipantInput,
): Promise<typeof participant> {
  await ensureWorkshopHasCapacity(
    workshop,
  );

  participant.status = "registered";

  participant.cancelledAt =
    undefined;

  participant.attendedAt =
    undefined;

  participant.noShowAt =
    undefined;

  participant.registeredAt =
    new Date();

  participant.fullName =
    normalizeParticipantName(
      data.fullName,
    );

  participant.email =
    normalizeParticipantEmail(
      data.email,
    );

  participant.phone =
    normalizeOptionalParticipantString(
      data.phone,
    );

  participant.organisationName =
    normalizeOptionalParticipantString(
      data.organisationName,
    );

  try {
    await participant.save();
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError(
        "This email is already registered for the workshop.",
        409,
      );
    }

    throw error;
  }

  return participant;
}

async function registerNewParticipant(
  workshop: IWorkshop,
  data: CreateWorkshopParticipantInput,
  email: string,
) {
  await ensureWorkshopHasCapacity(
    workshop,
  );

  try {
    return await WorkshopParticipant.create({
      workshopId:
        workshop._id,
      fullName:
        normalizeParticipantName(
          data.fullName,
        ),
      email,
      phone:
        normalizeOptionalParticipantString(
          data.phone,
        ),
      organisationName:
        normalizeOptionalParticipantString(
          data.organisationName,
        ),
      status: "registered",
      registeredAt: new Date(),
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError(
        "This email is already registered for the workshop.",
        409,
      );
    }

    throw error;
  }
}

export async function registerParticipant(
  workshopId: string,
  data: CreateWorkshopParticipantInput,
  options: RegisterParticipantOptions = {},
) {
  const workshop =
    await getWorkshopOrFail(
      workshopId,
    );

  const email =
    normalizeParticipantEmail(
      data.email,
    );

  const allowPostPaymentFulfilment =
    options.allowPostPaymentFulfilment ===
    true;

  if (!allowPostPaymentFulfilment) {
    validateRegistrationEligibility(
      workshop,
    );
  }

  const existingParticipant =
    await WorkshopParticipant.findOne({
      workshopId:
        workshop._id,
      email,
    });

  if (existingParticipant) {
    if (
      existingParticipant.status ===
      "cancelled"
    ) {
      return restoreCancelledParticipant(
        existingParticipant,
        workshop,
        {
          ...data,
          email,
        },
      );
    }

    throw new AppError(
      "This email is already registered for the workshop.",
      409,
    );
  }

  return registerNewParticipant(
    workshop,
    {
      ...data,
      email,
    },
    email,
  );
}

export async function getWorkshopParticipants(
  workshopId: string,
) {
  const workshop =
    await getWorkshopOrFail(
      workshopId,
    );

  return WorkshopParticipant.find({
    workshopId:
      workshop._id,
  }).sort({
    registeredAt: -1,
  });
}

export async function getParticipantById(
  participantId: string,
) {
  return getParticipantOrFail(
    participantId,
  );
}

export async function updateParticipantStatus(
  participantId: string,
  status: WorkshopParticipantStatus,
) {
  const participant =
    await getParticipantOrFail(
      participantId,
    );

  if (
    participant.status ===
      "cancelled" &&
    status !== "registered"
  ) {
    throw new AppError(
      "A cancelled participant can only be re-registered.",
      400,
    );
  }

  if (
    participant.status ===
      "attended" &&
    status !== "attended"
  ) {
    throw new AppError(
      "An attended participant cannot be moved to another status.",
      400,
    );
  }

  if (status === "registered") {
    const workshop =
      await getWorkshopOrFail(
        participant.workshopId.toString(),
      );

    if (
      participant.status !==
      "registered"
    ) {
      await ensureWorkshopHasCapacity(
        workshop,
      );
    }

    participant.registeredAt =
      new Date();

    participant.attendedAt =
      undefined;

    participant.cancelledAt =
      undefined;

    participant.noShowAt =
      undefined;
  }

  if (status === "attended") {
    participant.attendedAt =
      participant.attendedAt ??
      new Date();

    participant.cancelledAt =
      undefined;

    participant.noShowAt =
      undefined;
  }

  if (status === "cancelled") {
    participant.cancelledAt =
      new Date();

    participant.attendedAt =
      undefined;

    participant.noShowAt =
      undefined;
  }

  if (status === "no_show") {
    participant.noShowAt =
      new Date();

    participant.attendedAt =
      undefined;

    participant.cancelledAt =
      undefined;
  }

  participant.status = status;

  await participant.save();

  return participant;
}

export async function cancelParticipant(
  participantId: string,
) {
  return updateParticipantStatus(
    participantId,
    "cancelled",
  );
}

export async function deleteParticipant(
  participantId: string,
) {
  const participant =
    await getParticipantOrFail(
      participantId,
    );

  await participant.deleteOne();

  return {
    deleted: true,
    participantId,
  };
}

export async function getWorkshopParticipantCount(
  workshopId: string,
) {
  const workshop =
    await getWorkshopOrFail(
      workshopId,
    );

  const [
    total,
    registered,
    attended,
    cancelled,
    noShow,
  ] = await Promise.all([
    WorkshopParticipant.countDocuments({
      workshopId:
        workshop._id,
    }),
    WorkshopParticipant.countDocuments({
      workshopId:
        workshop._id,
      status: "registered",
    }),
    WorkshopParticipant.countDocuments({
      workshopId:
        workshop._id,
      status: "attended",
    }),
    WorkshopParticipant.countDocuments({
      workshopId:
        workshop._id,
      status: "cancelled",
    }),
    WorkshopParticipant.countDocuments({
      workshopId:
        workshop._id,
      status: "no_show",
    }),
  ]);

  return {
    total,
    registered,
    attended,
    cancelled,
    noShow,
    capacity:
      workshop.capacity ??
      null,
    remaining:
      workshop.capacity !==
      undefined
        ? Math.max(
            workshop.capacity -
              registered -
              attended,
            0,
          )
        : null,
  };
}