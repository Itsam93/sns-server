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

const ACTIVE_PARTICIPANT_STATUSES: WorkshopParticipantStatus[] = [
  "registered",
  "attended",
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

async function getWorkshopOrFail(
  workshopId: string,
): Promise<IWorkshop> {
  validateObjectId(
    workshopId,
    "workshop ID",
  );

  const workshop =
    await Workshop.findById(
      workshopId,
    );

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
) {
  if (
    workshop.status !==
    "published"
  ) {
    throw new AppError(
      "Registration is not available for this workshop.",
      409,
    );
  }

  if (
    !workshop.registrationRequired
  ) {
    throw new AppError(
      "Registration is not required for this workshop.",
      409,
    );
  }

  if (
    workshop.startDate <=
    new Date()
  ) {
    throw new AppError(
      "Registration is closed because the workshop has already started.",
      409,
    );
  }

  if (
    workshop.registrationDeadline &&
    workshop.registrationDeadline <
      new Date()
  ) {
    throw new AppError(
      "Registration for this workshop has closed.",
      409,
    );
  }
}

async function getActiveParticipantCount(
  workshopId: mongoose.Types.ObjectId,
) {
  return WorkshopParticipant.countDocuments(
    {
      workshopId,
      status: {
        $in: [
          ...ACTIVE_PARTICIPANT_STATUSES,
        ],
      },
    },
  );
}

export async function registerParticipant(
  workshopId: string,
  data: CreateWorkshopParticipantInput,
) {
  const workshop =
    await getWorkshopOrFail(
      workshopId,
    );

  validateRegistrationEligibility(
    workshop,
  );

  const email =
    data.email.toLowerCase();

  const existingParticipant =
    await WorkshopParticipant.findOne(
      {
        workshopId:
          workshop._id,
        email,
      },
    );

  if (existingParticipant) {
    if (
      existingParticipant.status ===
      "cancelled"
    ) {
      existingParticipant.status =
        "registered";

      existingParticipant.cancelledAt =
        undefined;

      existingParticipant.registeredAt =
        new Date();

      existingParticipant.fullName =
        data.fullName;

      existingParticipant.phone =
        data.phone;

      existingParticipant.organisationName =
        data.organisationName;

      await existingParticipant.save();

      return existingParticipant;
    }

    throw new AppError(
      "This email is already registered for the workshop.",
      409,
    );
  }

  if (
    workshop.capacity !==
    undefined
  ) {
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

  try {
    return await WorkshopParticipant.create(
      {
        workshopId:
          workshop._id,
        fullName:
          data.fullName,
        email,
        phone:
          data.phone,
        organisationName:
          data.organisationName,
        status:
          "registered",
        registeredAt:
          new Date(),
      },
    );
  } catch (error) {
    if (
      error instanceof
        mongoose.Error &&
      "code" in error &&
      error.code === 11000
    ) {
      throw new AppError(
        "This email is already registered for the workshop.",
        409,
      );
    }

    throw error;
  }
}

export async function getWorkshopParticipants(
  workshopId: string,
) {
  const workshop =
    await getWorkshopOrFail(
      workshopId,
    );

  return WorkshopParticipant.find(
    {
      workshopId:
        workshop._id,
    },
  ).sort({
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

  if (
    status === "attended"
  ) {
    participant.attendedAt =
      participant.attendedAt ??
      new Date();

    participant.cancelledAt =
      undefined;
  }

  if (
    status === "cancelled"
  ) {
    participant.cancelledAt =
      new Date();

    participant.attendedAt =
      undefined;
  }

  if (
    status === "registered"
  ) {
    participant.registeredAt =
      new Date();

    participant.cancelledAt =
      undefined;

    participant.attendedAt =
      undefined;
  }

  participant.status =
    status;

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
    WorkshopParticipant.countDocuments(
      {
        workshopId:
          workshop._id,
      },
    ),

    WorkshopParticipant.countDocuments(
      {
        workshopId:
          workshop._id,
        status:
          "registered",
      },
    ),

    WorkshopParticipant.countDocuments(
      {
        workshopId:
          workshop._id,
        status:
          "attended",
      },
    ),

    WorkshopParticipant.countDocuments(
      {
        workshopId:
          workshop._id,
        status:
          "cancelled",
      },
    ),

    WorkshopParticipant.countDocuments(
      {
        workshopId:
          workshop._id,
        status:
          "no_show",
      },
    ),
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