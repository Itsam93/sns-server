import { Appointment } from "../models/Appointment.js";
import { Availability } from "../models/Availability.js";
import {
  AvailabilityException,
} from "../models/AvailabilityException.js";
import { Service } from "../models/Service.js";
import { AppError } from "../utils/appError.js";

type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday";

type TimeWindow = {
  startTime: string;
  endTime: string;
};

type BookedAppointment = {
  requestedStart?: Date;
  requestedEnd?: Date;
  scheduledStart?: Date;
  scheduledEnd?: Date;
};

export type AvailableSlot = {
  start: Date;
  end: Date;
  startTime: string;
  endTime: string;
};

const RESERVED_APPOINTMENT_STATUSES = [
  "pending",
  "accepted",
  "ongoing",
  "rescheduled",
] as const;

function getDayOfWeek(
  date: Date,
): DayOfWeek | null {
  const days: Array<
    DayOfWeek | null
  > = [
    null,
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    null,
  ];

  return days[date.getDay()] ?? null;
}

function formatTime(
  date: Date,
) {
  const hours = String(
    date.getHours(),
  ).padStart(2, "0");

  const minutes = String(
    date.getMinutes(),
  ).padStart(2, "0");

  return `${hours}:${minutes}`;
}

function combineDateAndTime(
  date: Date,
  time: string,
) {
  const [
    hoursText,
    minutesText,
  ] = time.split(":");

  if (
    !hoursText ||
    !minutesText
  ) {
    throw new AppError(
      "Invalid availability time.",
      400,
    );
  }

  const hours =
    Number(hoursText);

  const minutes =
    Number(minutesText);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new AppError(
      "Invalid availability time.",
      400,
    );
  }

  const result =
    new Date(date);

  result.setHours(
    hours,
    minutes,
    0,
    0,
  );

  return result;
}

function addMinutes(
  date: Date,
  minutes: number,
) {
  return new Date(
    date.getTime() +
      minutes * 60 * 1000,
  );
}

function isWeekend(
  date: Date,
) {
  const day = date.getDay();

  return (
    day === 0 ||
    day === 6
  );
}

function normalizeDate(
  date: Date,
) {
  const result =
    new Date(date);

  result.setHours(
    0,
    0,
    0,
    0,
  );

  return result;
}

function getDayRange(
  date: Date,
) {
  const start =
    normalizeDate(date);

  const end =
    new Date(start);

  end.setDate(
    end.getDate() + 1,
  );

  return {
    start,
    end,
  };
}

async function getScheduleForDate(
  date: Date,
): Promise<TimeWindow[]> {
  if (isWeekend(date)) {
    return [];
  }

  const {
    start,
    end,
  } = getDayRange(date);

  const exception =
    await AvailabilityException.findOne(
      {
        date: {
          $gte: start,
          $lt: end,
        },
        isActive: true,
      },
    ).lean();

  if (exception) {
    if (
      exception.type ===
      "blocked"
    ) {
      return [];
    }

    if (
      exception.type ===
        "custom" &&
      exception.startTime &&
      exception.endTime
    ) {
      return [
        {
          startTime:
            exception.startTime,
          endTime:
            exception.endTime,
        },
      ];
    }

    return [];
  }

  const dayOfWeek =
    getDayOfWeek(date);

  if (!dayOfWeek) {
    return [];
  }

  const availability =
    await Availability.find({
      dayOfWeek,
      isActive: true,
    })
      .sort({
        startTime: 1,
      })
      .lean();

  return availability.map(
    (item) => ({
      startTime:
        item.startTime,
      endTime:
        item.endTime,
    }),
  );
}

async function getServiceDuration(
  serviceId: string,
) {
  const service =
    await Service.findOne({
      _id: serviceId,
      isActive: true,
    }).select(
      "_id durationMinutes",
    );

  if (!service) {
    throw new AppError(
      "Service not found or inactive.",
      404,
    );
  }

  return service.durationMinutes;
}

async function getBookedAppointments(
  date: Date,
) {
  const {
    start,
    end,
  } = getDayRange(date);

  return Appointment.find({
    status: {
      $in: [
        ...RESERVED_APPOINTMENT_STATUSES,
      ],
    },

    $or: [
      {
        requestedStart: {
          $lt: end,
          $exists: true,
        },

        requestedEnd: {
          $gt: start,
          $exists: true,
        },
      },

      {
        scheduledStart: {
          $lt: end,
          $exists: true,
        },

        scheduledEnd: {
          $gt: start,
          $exists: true,
        },
      },
    ],
  })
    .select(
      "requestedStart requestedEnd scheduledStart scheduledEnd",
    )
    .lean();
}

function overlaps(
  start: Date,
  end: Date,
  existingStart?: Date,
  existingEnd?: Date,
) {
  if (
    !existingStart ||
    !existingEnd
  ) {
    return false;
  }

  return (
    start < existingEnd &&
    end > existingStart
  );
}

function appointmentOverlaps(
  start: Date,
  end: Date,
  appointment: BookedAppointment,
) {
  const requestedConflict =
    overlaps(
      start,
      end,
      appointment.requestedStart,
      appointment.requestedEnd,
    );

  if (requestedConflict) {
    return true;
  }

  return overlaps(
    start,
    end,
    appointment.scheduledStart,
    appointment.scheduledEnd,
  );
}

function generateSlots(
  date: Date,
  windows: TimeWindow[],
  durationMinutes: number,
  bookedAppointments: BookedAppointment[],
) {
  const slots: AvailableSlot[] =
    [];

  for (const window of windows) {
    let currentStart =
      combineDateAndTime(
        date,
        window.startTime,
      );

    const windowEnd =
      combineDateAndTime(
        date,
        window.endTime,
      );

    while (true) {
      const currentEnd =
        addMinutes(
          currentStart,
          durationMinutes,
        );

      if (
        currentEnd > windowEnd
      ) {
        break;
      }

      const hasConflict =
        bookedAppointments.some(
          (appointment) =>
            appointmentOverlaps(
              currentStart,
              currentEnd,
              appointment,
            ),
        );

      if (!hasConflict) {
        slots.push({
          start: currentStart,
          end: currentEnd,
          startTime:
            formatTime(
              currentStart,
            ),
          endTime:
            formatTime(
              currentEnd,
            ),
        });
      }

      currentStart =
        currentEnd;
    }
  }

  return slots;
}

function removePastSlots(
  slots: AvailableSlot[],
  now = new Date(),
) {
  return slots.filter(
    (slot) => slot.start > now,
  );
}

export async function getAvailableSlots(
  date: Date,
  serviceId: string,
) {
  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    throw new AppError(
      "Invalid appointment date.",
      400,
    );
  }

  if (isWeekend(date)) {
    return [];
  }

  const normalizedDate =
    normalizeDate(date);

  const [
    durationMinutes,
    schedule,
    bookedAppointments,
  ] = await Promise.all([
    getServiceDuration(
      serviceId,
    ),

    getScheduleForDate(
      normalizedDate,
    ),

    getBookedAppointments(
      normalizedDate,
    ),
  ]);

  if (!schedule.length) {
    return [];
  }

  const slots =
    generateSlots(
      normalizedDate,
      schedule,
      durationMinutes,
      bookedAppointments,
    );

  return removePastSlots(
    slots,
  );
}

export async function getAvailableSlotsForDateRange(
  from: Date,
  to: Date,
  serviceId: string,
) {
  if (
    Number.isNaN(
      from.getTime(),
    ) ||
    Number.isNaN(
      to.getTime(),
    )
  ) {
    throw new AppError(
      "Invalid date range.",
      400,
    );
  }

  const start =
    normalizeDate(from);

  const end =
    normalizeDate(to);

  if (start > end) {
    throw new AppError(
      "The from date must be before the to date.",
      400,
    );
  }

  const results: Array<{
    date: Date;
    slots: AvailableSlot[];
  }> = [];

  const current =
    new Date(start);

  while (current <= end) {
    if (!isWeekend(current)) {
      const slots =
        await getAvailableSlots(
          current,
          serviceId,
        );

      results.push({
        date: new Date(
          current,
        ),
        slots,
      });
    }

    current.setDate(
      current.getDate() + 1,
    );
  }

  return results;
}