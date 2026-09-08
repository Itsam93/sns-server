import { Availability } from "../models/Availability.js";
import type { DayOfWeek } from "../models/Availability.js";
import { AppError } from "../utils/appError.js";

const WEEKDAYS: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
];

function validateDay(dayOfWeek: string): asserts dayOfWeek is DayOfWeek {
  if (!WEEKDAYS.includes(dayOfWeek as DayOfWeek)) {
    throw new AppError(
      "Availability can only be set from Monday to Friday.",
      400,
    );
  }
}

function validateTime(time: string, fieldName: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);

  if (!match) {
    throw new AppError(
      `${fieldName} must be in HH:mm format.`,
      400,
    );
  }
}

function validateTimeRange(
  startTime: string,
  endTime: string,
) {
  validateTime(startTime, "Start time");
  validateTime(endTime, "End time");

  if (startTime >= endTime) {
    throw new AppError(
      "End time must be later than start time.",
      400,
    );
  }
}

async function ensureNoOverlap(
  dayOfWeek: DayOfWeek,
  startTime: string,
  endTime: string,
  excludeId?: string,
) {
  const query: {
    dayOfWeek: DayOfWeek;
    isActive: boolean;
    _id?: { $ne: string };
    startTime: { $lt: string };
    endTime: { $gt: string };
  } = {
    dayOfWeek,
    isActive: true,
    startTime: {
      $lt: endTime,
    },
    endTime: {
      $gt: startTime,
    },
  };

  if (excludeId) {
    query._id = {
      $ne: excludeId,
    };
  }

  const overlappingAvailability =
    await Availability.findOne(query).select("_id");

  if (overlappingAvailability) {
    throw new AppError(
      "This availability period overlaps with an existing active availability period.",
      409,
    );
  }
}

export async function getAvailability() {
  return Availability.find()
    .sort({
      dayOfWeek: 1,
      startTime: 1,
    })
    .lean();
}

export async function getActiveAvailability() {
  return Availability.find({
    isActive: true,
  })
    .sort({
      dayOfWeek: 1,
      startTime: 1,
    })
    .lean();
}

export async function getAvailabilityById(
  availabilityId: string,
) {
  const availability =
    await Availability.findById(
      availabilityId,
    );

  if (!availability) {
    throw new AppError(
      "Availability not found.",
      404,
    );
  }

  return availability;
}

export async function createAvailability(data: {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isActive?: boolean;
}) {
  validateDay(data.dayOfWeek);

  validateTimeRange(
    data.startTime,
    data.endTime,
  );

  const isActive =
    data.isActive ?? true;

  if (isActive) {
    await ensureNoOverlap(
      data.dayOfWeek,
      data.startTime,
      data.endTime,
    );
  }

  return Availability.create({
    dayOfWeek: data.dayOfWeek,
    startTime: data.startTime,
    endTime: data.endTime,
    isActive,
  });
}

export async function updateAvailability(
  availabilityId: string,
  data: {
    dayOfWeek?: DayOfWeek;
    startTime?: string;
    endTime?: string;
    isActive?: boolean;
  },
) {
  const availability =
    await Availability.findById(
      availabilityId,
    );

  if (!availability) {
    throw new AppError(
      "Availability not found.",
      404,
    );
  }

  const dayOfWeek =
    data.dayOfWeek ??
    availability.dayOfWeek;

  const startTime =
    data.startTime ??
    availability.startTime;

  const endTime =
    data.endTime ??
    availability.endTime;

  const isActive =
    data.isActive ??
    availability.isActive;

  validateDay(dayOfWeek);

  validateTimeRange(
    startTime,
    endTime,
  );

  if (isActive) {
    await ensureNoOverlap(
      dayOfWeek,
      startTime,
      endTime,
      availabilityId,
    );
  }

  availability.dayOfWeek =
    dayOfWeek;

  availability.startTime =
    startTime;

  availability.endTime =
    endTime;

  availability.isActive =
    isActive;

  await availability.save();

  return availability;
}

export async function deleteAvailability(
  availabilityId: string,
) {
  const availability =
    await Availability.findById(
      availabilityId,
    );

  if (!availability) {
    throw new AppError(
      "Availability not found.",
      404,
    );
  }

  await availability.deleteOne();
}

export async function setAvailabilityStatus(
  availabilityId: string,
  isActive: boolean,
) {
  const availability =
    await Availability.findById(
      availabilityId,
    );

  if (!availability) {
    throw new AppError(
      "Availability not found.",
      404,
    );
  }

  if (isActive) {
    await ensureNoOverlap(
      availability.dayOfWeek,
      availability.startTime,
      availability.endTime,
      availabilityId,
    );
  }

  availability.isActive =
    isActive;

  await availability.save();

  return availability;
}