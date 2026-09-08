import {
  AvailabilityException,
} from "../models/AvailabilityException.js";

import type {
  AvailabilityExceptionType,
} from "../models/AvailabilityException.js";

import { AppError } from "../utils/appError.js";

const TIME_REGEX =
  /^([01]\d|2[0-3]):([0-5]\d)$/;

function validateTime(
  time: string,
  fieldName: string,
) {
  if (!TIME_REGEX.test(time)) {
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

function normalizeDate(date: Date) {
  const normalized = new Date(date);

  normalized.setHours(
    0,
    0,
    0,
    0,
  );

  return normalized;
}

function validateWeekday(date: Date) {
  const day = date.getDay();

  if (
    day === 0 ||
    day === 6
  ) {
    throw new AppError(
      "Availability exceptions can only be set for Monday to Friday.",
      400,
    );
  }
}

async function findExistingException(
  date: Date,
  excludeId?: string,
) {
  const normalizedDate =
    normalizeDate(date);

  const nextDate = new Date(
    normalizedDate,
  );

  nextDate.setDate(
    nextDate.getDate() + 1,
  );

  const query: {
    date: {
      $gte: Date;
      $lt: Date;
    };
    isActive: boolean;
    _id?: {
      $ne: string;
    };
  } = {
    date: {
      $gte: normalizedDate,
      $lt: nextDate,
    },
    isActive: true,
  };

  if (excludeId) {
    query._id = {
      $ne: excludeId,
    };
  }

  return AvailabilityException.findOne(
    query,
  ).select("_id type");
}

async function ensureNoConflict(
  date: Date,
  excludeId?: string,
) {
  const existing =
    await findExistingException(
      date,
      excludeId,
    );

  if (existing) {
    throw new AppError(
      "An active availability exception already exists for this date.",
      409,
    );
  }
}

function validateExceptionData(data: {
  type: AvailabilityExceptionType;
  startTime?: string;
  endTime?: string;
}) {
  if (data.type === "blocked") {
    if (
      data.startTime ||
      data.endTime
    ) {
      throw new AppError(
        "Blocked dates must not have availability times.",
        400,
      );
    }

    return;
  }

  if (
    !data.startTime ||
    !data.endTime
  ) {
    throw new AppError(
      "Start time and end time are required for custom availability.",
      400,
    );
  }

  validateTimeRange(
    data.startTime,
    data.endTime,
  );
}

export async function getExceptions(
  options?: {
    from?: Date;
    to?: Date;
  },
) {
  const query: {
    date?: {
      $gte?: Date;
      $lte?: Date;
    };
    isActive?: boolean;
  } = {
    isActive: true,
  };

  if (
    options?.from ||
    options?.to
  ) {
    query.date = {};

    if (options.from) {
      query.date.$gte =
        normalizeDate(options.from);
    }

    if (options.to) {
      const endDate =
        normalizeDate(options.to);

      endDate.setHours(
        23,
        59,
        59,
        999,
      );

      query.date.$lte = endDate;
    }
  }

  return AvailabilityException.find(
    query,
  )
    .sort({
      date: 1,
    })
    .lean();
}

export async function getAllExceptions() {
  return AvailabilityException.find()
    .sort({
      date: 1,
    })
    .lean();
}

export async function getExceptionById(
  exceptionId: string,
) {
  const exception =
    await AvailabilityException.findById(
      exceptionId,
    );

  if (!exception) {
    throw new AppError(
      "Availability exception not found.",
      404,
    );
  }

  return exception;
}

export async function createException(data: {
  date: Date;
  type: AvailabilityExceptionType;
  startTime?: string;
  endTime?: string;
  reason?: string;
  isActive?: boolean;
}) {
  const date =
    normalizeDate(data.date);

  validateWeekday(date);

  validateExceptionData({
    type: data.type,
    startTime: data.startTime,
    endTime: data.endTime,
  });

  const isActive =
    data.isActive ?? true;

  if (isActive) {
    await ensureNoConflict(date);
  }

  return AvailabilityException.create({
    date,
    type: data.type,
    startTime:
      data.type === "custom"
        ? data.startTime
        : undefined,
    endTime:
      data.type === "custom"
        ? data.endTime
        : undefined,
    reason: data.reason,
    isActive,
  });
}

export async function updateException(
  exceptionId: string,
  data: {
    date?: Date;
    type?: AvailabilityExceptionType;
    startTime?: string;
    endTime?: string;
    reason?: string;
    isActive?: boolean;
  },
) {
  const exception =
    await AvailabilityException.findById(
      exceptionId,
    );

  if (!exception) {
    throw new AppError(
      "Availability exception not found.",
      404,
    );
  }

  const date = data.date
    ? normalizeDate(data.date)
    : normalizeDate(exception.date);

  const type =
    data.type ?? exception.type;

  const startTime =
    data.startTime ??
    exception.startTime;

  const endTime =
    data.endTime ??
    exception.endTime;

  const isActive =
    data.isActive ??
    exception.isActive;

  validateWeekday(date);

  validateExceptionData({
    type,
    startTime,
    endTime,
  });

  if (isActive) {
    await ensureNoConflict(
      date,
      exceptionId,
    );
  }

  exception.date = date;
  exception.type = type;
  exception.startTime =
    type === "custom"
      ? startTime
      : undefined;
  exception.endTime =
    type === "custom"
      ? endTime
      : undefined;
  exception.reason =
    data.reason ?? exception.reason;
  exception.isActive =
    isActive;

  await exception.save();

  return exception;
}

export async function deleteException(
  exceptionId: string,
) {
  const exception =
    await AvailabilityException.findById(
      exceptionId,
    );

  if (!exception) {
    throw new AppError(
      "Availability exception not found.",
      404,
    );
  }

  await exception.deleteOne();
}

export async function setExceptionStatus(
  exceptionId: string,
  isActive: boolean,
) {
  const exception =
    await AvailabilityException.findById(
      exceptionId,
    );

  if (!exception) {
    throw new AppError(
      "Availability exception not found.",
      404,
    );
  }

  if (isActive) {
    await ensureNoConflict(
      exception.date,
      exceptionId,
    );
  }

  exception.isActive =
    isActive;

  await exception.save();

  return exception;
}