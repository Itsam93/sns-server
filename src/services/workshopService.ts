import mongoose from "mongoose";

import {
  Workshop,
  type WorkshopStatus,
  type WorkshopType,
} from "../models/Workshop.js";
import { WorkshopParticipant } from "../models/WorkshopParticipant.js";
import { AppError } from "../utils/appError.js";

type CreateWorkshopInput = {
  title: string;
  slug: string;
  type: WorkshopType;
  description: string;
  shortDescription?: string;
  startDate: Date;
  endDate?: Date;
  startTime?: string;
  endTime?: string;
  location?: string;
  isOnline?: boolean;
  meetingLink?: string;
  capacity?: number;
  registrationRequired?: boolean;
  registrationDeadline?: Date;
  status?: WorkshopStatus;
  featuredImage?: string;
};

type UpdateWorkshopInput =
  Partial<CreateWorkshopInput>;

const WORKSHOP_STATUSES: WorkshopStatus[] = [
  "draft",
  "published",
  "completed",
  "cancelled",
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

function validateWorkshopDates(
  startDate: Date,
  endDate?: Date,
) {
  if (
    Number.isNaN(startDate.getTime())
  ) {
    throw new AppError(
      "Workshop start date is invalid.",
      400,
    );
  }

  if (
    endDate &&
    Number.isNaN(endDate.getTime())
  ) {
    throw new AppError(
      "Workshop end date is invalid.",
      400,
    );
  }

  if (
    endDate &&
    endDate < startDate
  ) {
    throw new AppError(
      "End date must not be before the start date.",
      400,
    );
  }
}

function validateWorkshopTimes(
  startTime?: string,
  endTime?: string,
) {
  if (
    startTime &&
    endTime &&
    startTime >= endTime
  ) {
    throw new AppError(
      "End time must be later than start time.",
      400,
    );
  }
}

function validateOnlineDetails(
  isOnline?: boolean,
  meetingLink?: string,
  location?: string,
) {
  if (isOnline && !meetingLink) {
    throw new AppError(
      "Meeting link is required for online workshops.",
      400,
    );
  }

  if (isOnline && location) {
    throw new AppError(
      "Online workshops should not have a physical location.",
      400,
    );
  }
}

function validateRegistrationDeadline(
  startDate: Date,
  registrationDeadline?: Date,
) {
  if (
    registrationDeadline &&
    registrationDeadline > startDate
  ) {
    throw new AppError(
      "Registration deadline must not be after the workshop start date.",
      400,
    );
  }
}

async function getWorkshopOrFail(
  workshopId: string,
) {
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

export async function createWorkshop(
  data: CreateWorkshopInput,
) {
  validateWorkshopDates(
    data.startDate,
    data.endDate,
  );

  validateWorkshopTimes(
    data.startTime,
    data.endTime,
  );

  validateOnlineDetails(
    data.isOnline,
    data.meetingLink,
    data.location,
  );

  validateRegistrationDeadline(
    data.startDate,
    data.registrationDeadline,
  );

  const existingWorkshop =
    await Workshop.findOne({
      slug: data.slug,
    });

  if (existingWorkshop) {
    throw new AppError(
      "A workshop with this slug already exists.",
      409,
    );
  }

  const workshop =
    await Workshop.create(data);

  return workshop;
}

export async function getPublishedWorkshops() {
  return Workshop.find({
    status: "published",
  }).sort({
    startDate: 1,
  });
}

export async function getUpcomingWorkshops() {
  return Workshop.find({
    status: "published",
    startDate: {
      $gte: new Date(),
    },
  }).sort({
    startDate: 1,
  });
}

export async function getWorkshopById(
  workshopId: string,
) {
  return getWorkshopOrFail(
    workshopId,
  );
}

export async function getWorkshopBySlug(
  slug: string,
) {
  const workshop =
    await Workshop.findOne({
      slug,
    });

  if (!workshop) {
    throw new AppError(
      "Workshop not found.",
      404,
    );
  }

  return workshop;
}

export async function getAllWorkshops() {
  return Workshop.find().sort({
    startDate: -1,
  });
}

export async function updateWorkshop(
  workshopId: string,
  data: UpdateWorkshopInput,
) {
  const workshop =
    await getWorkshopOrFail(
      workshopId,
    );

  const startDate =
    data.startDate ??
    workshop.startDate;

  const endDate =
    data.endDate ??
    workshop.endDate;

  const startTime =
    data.startTime ??
    workshop.startTime;

  const endTime =
    data.endTime ??
    workshop.endTime;

  const isOnline =
    data.isOnline ??
    workshop.isOnline;

  const meetingLink =
    data.meetingLink ??
    workshop.meetingLink;

  const location =
    data.location ??
    workshop.location;

  const registrationDeadline =
    data.registrationDeadline ??
    workshop.registrationDeadline;

  validateWorkshopDates(
    startDate,
    endDate,
  );

  validateWorkshopTimes(
    startTime,
    endTime,
  );

  validateOnlineDetails(
    isOnline,
    meetingLink,
    location,
  );

  validateRegistrationDeadline(
    startDate,
    registrationDeadline,
  );

  if (
    data.slug &&
    data.slug !== workshop.slug
  ) {
    const existingWorkshop =
      await Workshop.findOne({
        slug: data.slug,
        _id: {
          $ne: workshop._id,
        },
      });

    if (existingWorkshop) {
      throw new AppError(
        "A workshop with this slug already exists.",
        409,
      );
    }
  }

  Object.assign(
    workshop,
    data,
  );

  await workshop.save();

  return workshop;
}

export async function updateWorkshopStatus(
  workshopId: string,
  status: WorkshopStatus,
) {
  if (
    !WORKSHOP_STATUSES.includes(status)
  ) {
    throw new AppError(
      "Invalid workshop status.",
      400,
    );
  }

  const workshop =
    await getWorkshopOrFail(
      workshopId,
    );

  const currentStatus =
    workshop.status;

  if (
    currentStatus === "completed" &&
    status !== "completed"
  ) {
    throw new AppError(
      "A completed workshop cannot be moved to another status.",
      400,
    );
  }

  if (
    currentStatus === "cancelled" &&
    status !== "cancelled"
  ) {
    throw new AppError(
      "A cancelled workshop cannot be reopened.",
      400,
    );
  }

  if (
    status === "published" &&
    workshop.startDate < new Date()
  ) {
    throw new AppError(
      "A workshop whose start date has passed cannot be published.",
      400,
    );
  }

  workshop.status = status;

  await workshop.save();

  return workshop;
}

export async function deleteWorkshop(
  workshopId: string,
) {
  const workshop =
    await getWorkshopOrFail(
      workshopId,
    );

  const participantCount =
    await WorkshopParticipant.countDocuments(
      {
        workshopId:
          workshop._id,
        status: {
          $in: [
            "registered",
            "attended",
          ],
        },
      },
    );

  if (participantCount > 0) {
    throw new AppError(
      "A workshop with registered participants cannot be deleted.",
      409,
    );
  }

  await workshop.deleteOne();

  return {
    deleted: true,
    workshopId,
  };
}