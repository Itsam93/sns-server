import { Appointment } from "../models/Appointment.js";
import {
  Availability,
  type DayOfWeek,
} from "../models/Availability.js";
import {
  AvailabilityException,
} from "../models/AvailabilityException.js";
import { Client } from "../models/Client.js";
import { Service } from "../models/Service.js";
import { AppError } from "../utils/appError.js";
import {
  notifyAppointmentAccepted,
  notifyAppointmentCancelled,
  notifyAppointmentCompleted,
  notifyAppointmentCreated,
  notifyAppointmentRejected,
  notifyAppointmentRescheduled,
} from "./appointmentNotificationService.js";

const ACTIVE_APPOINTMENT_STATUSES = [
  "pending",
  "accepted",
  "ongoing",
  "rescheduled",
] as const;

const RESERVED_APPOINTMENT_STATUSES = [
  "pending",
  "accepted",
  "ongoing",
  "rescheduled",
] as const;

type SessionType =
  | "in_person"
  | "online"
  | "phone";

type CreateAppointmentInput = {
  clientId: string;
  serviceId: string;
  requestedDate: Date;
  requestedTime: string;
  sessionType: SessionType;
};

type AcceptAppointmentInput = {
  appointmentId: string;
  scheduledDate: Date;
  scheduledTime: string;
  adminNote?: string;
  meetingLink?: string;
  location?: string;
};

type RescheduleAppointmentInput = {
  appointmentId: string;
  requestedDate: Date;
  requestedTime: string;
};

type TimeWindow = {
  startTime: string;
  endTime: string;
};

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

function isWeekend(
  date: Date,
) {
  const day = date.getDay();

  return (
    day === 0 ||
    day === 6
  );
}

function validateTimeFormat(
  time: string,
) {
  if (
    !/^([01]\d|2[0-3]):([0-5]\d)$/.test(
      time,
    )
  ) {
    throw new AppError(
      "Appointment time must be in HH:mm format.",
      400,
    );
  }
}

function combineDateAndTime(
  date: Date,
  time: string,
) {
  validateTimeFormat(time);

  const [
    hoursText,
    minutesText,
  ] = time.split(":");

  if (
    !hoursText ||
    !minutesText
  ) {
    throw new AppError(
      "Invalid appointment time.",
      400,
    );
  }

  const hours =
    Number(hoursText);

  const minutes =
    Number(minutesText);

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
    await AvailabilityException.findOne({
      date: {
        $gte: start,
        $lt: end,
      },
      isActive: true,
    }).lean();

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

async function validateClient(
  clientId: string,
) {
  const client =
    await Client.findById(
      clientId,
    ).select(
      "_id userId",
    );

  if (!client) {
    throw new AppError(
      "Client profile not found.",
      404,
    );
  }

  return client;
}

async function validateService(
  serviceId: string,
) {
  const service =
    await Service.findOne({
      _id: serviceId,
      isActive: true,
    });

  if (!service) {
    throw new AppError(
      "The selected service is unavailable.",
      404,
    );
  }

  return service;
}

async function validateDateAndAvailability(
  date: Date,
  time: string,
  durationMinutes: number,
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
    throw new AppError(
      "Appointments are only available from Monday to Friday.",
      400,
    );
  }

  const start =
    combineDateAndTime(
      date,
      time,
    );

  const end =
    addMinutes(
      start,
      durationMinutes,
    );

  if (
    start <= new Date()
  ) {
    throw new AppError(
      "Appointment time must be in the future.",
      400,
    );
  }

  const schedule =
    await getScheduleForDate(
      date,
    );

  if (!schedule.length) {
    throw new AppError(
      "There is no counselling availability on the selected date.",
      400,
    );
  }

  const fitsWindow =
    schedule.some(
      (window) => {
        const windowStart =
          combineDateAndTime(
            date,
            window.startTime,
          );

        const windowEnd =
          combineDateAndTime(
            date,
            window.endTime,
          );

        return (
          start >= windowStart &&
          end <= windowEnd
        );
      },
    );

  if (!fitsWindow) {
    throw new AppError(
      "The selected time is outside available counselling hours.",
      400,
    );
  }

  return {
    start,
    end,
  };
}

async function checkScheduleConflict(
  start: Date,
  end: Date,
  excludeAppointmentId?: string,
) {
  const query: Record<
    string,
    unknown
  > = {
    status: {
      $in:
        RESERVED_APPOINTMENT_STATUSES,
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
  };

  if (excludeAppointmentId) {
    query._id = {
      $ne: excludeAppointmentId,
    };
  }

  return Appointment.findOne(
    query,
  );
}

function createBookingKey(
  start: Date,
  end: Date,
) {
  return `${start.getTime()}-${end.getTime()}`;
}

function isDuplicateKeyError(
  error: unknown,
) {
  return (
    typeof error ===
      "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

async function sendAppointmentNotificationSafely(
  notification:
    () => Promise<unknown>,
) {
  try {
    await notification();
  } catch (error) {
    console.error(
      "Appointment notification failed:",
      error,
    );
  }
}

/*
|--------------------------------------------------------------------------
| Booking Eligibility
|--------------------------------------------------------------------------
*/

export async function canClientBook(
  clientId: string,
) {
  await validateClient(
    clientId,
  );

  const appointment =
    await Appointment.findOne({
      clientId,
      status: {
        $in:
          ACTIVE_APPOINTMENT_STATUSES,
      },
    })
      .sort({
        createdAt: -1,
      })
      .populate("serviceId");

  if (!appointment) {
    return {
      canBook: true,
      appointment: null,
      reason: null,
    };
  }

  return {
    canBook: false,
    appointment,
    reason:
      "ACTIVE_APPOINTMENT",
  };
}

/*
|--------------------------------------------------------------------------
| Create Appointment
|--------------------------------------------------------------------------
*/

export async function createAppointment(
  input: CreateAppointmentInput,
) {
  await validateClient(
    input.clientId,
  );

  const eligibility =
    await canClientBook(
      input.clientId,
    );

  if (!eligibility.canBook) {
    throw new AppError(
      "You already have an active appointment and cannot book another session.",
      409,
    );
  }

  const service =
    await validateService(
      input.serviceId,
    );

  const {
    start,
    end,
  } =
    await validateDateAndAvailability(
      input.requestedDate,
      input.requestedTime,
      service.durationMinutes,
    );

  const conflict =
    await checkScheduleConflict(
      start,
      end,
    );

  if (conflict) {
    throw new AppError(
      "The selected time is no longer available.",
      409,
    );
  }

  const bookingKey =
    createBookingKey(
      start,
      end,
    );

  let appointment;

  try {
    appointment =
      await Appointment.create({
        clientId:
          input.clientId,

        serviceId:
          input.serviceId,

        requestedDate:
          input.requestedDate,

        requestedTime:
          input.requestedTime,

        requestedStart:
          start,

        requestedEnd:
          end,

        sessionType:
          input.sessionType,

        status: "pending",

        bookingKey,
      });
  } catch (error: unknown) {
    if (
      isDuplicateKeyError(
        error,
      )
    ) {
      throw new AppError(
        "The selected time is no longer available.",
        409,
      );
    }

    throw error;
  }

  await sendAppointmentNotificationSafely(
    () =>
      notifyAppointmentCreated(
        appointment._id.toString(),
      ),
  );

  return appointment;
}

/*
|--------------------------------------------------------------------------
| Client Appointments
|--------------------------------------------------------------------------
*/

export async function getClientAppointments(
  clientId: string,
) {
  await validateClient(
    clientId,
  );

  return Appointment.find({
    clientId,
  })
    .populate("serviceId")
    .sort({
      createdAt: -1,
    });
}

export async function getClientAppointmentById(
  appointmentId: string,
  clientId: string,
) {
  await validateClient(
    clientId,
  );

  const appointment =
    await Appointment.findOne({
      _id: appointmentId,
      clientId,
    })
      .populate("clientId")
      .populate("serviceId");

  if (!appointment) {
    throw new AppError(
      "Appointment not found.",
      404,
    );
  }

  return appointment;
}

/*
|--------------------------------------------------------------------------
| General Appointment Lookup
|--------------------------------------------------------------------------
*/

export async function getAppointmentById(
  appointmentId: string,
) {
  const appointment =
    await Appointment.findById(
      appointmentId,
    )
      .populate("clientId")
      .populate("serviceId");

  if (!appointment) {
    throw new AppError(
      "Appointment not found.",
      404,
    );
  }

  return appointment;
}

export async function getAllAppointments() {
  return Appointment.find()
    .populate("clientId")
    .populate("serviceId")
    .sort({
      createdAt: -1,
    });
}

/*
|--------------------------------------------------------------------------
| Accept Appointment
|--------------------------------------------------------------------------
*/

export async function acceptAppointment(
  input: AcceptAppointmentInput,
) {
  const appointment =
    await Appointment.findById(
      input.appointmentId,
    );

  if (!appointment) {
    throw new AppError(
      "Appointment not found.",
      404,
    );
  }

  if (
    appointment.status !==
    "pending"
  ) {
    throw new AppError(
      "Only pending appointments can be accepted.",
      400,
    );
  }

  const service =
    await validateService(
      appointment.serviceId.toString(),
    );

  const {
    start,
    end,
  } =
    await validateDateAndAvailability(
      input.scheduledDate,
      input.scheduledTime,
      service.durationMinutes,
    );

  const conflict =
    await checkScheduleConflict(
      start,
      end,
      appointment.id,
    );

  if (conflict) {
    throw new AppError(
      "This appointment time is already occupied.",
      409,
    );
  }

  const bookingKey =
    createBookingKey(
      start,
      end,
    );

  try {
    appointment.scheduledStart =
      start;

    appointment.scheduledEnd =
      end;

    appointment.bookingKey =
      bookingKey;

    appointment.status =
      "accepted";

    appointment.acceptedAt =
      new Date();

    appointment.adminNote =
      input.adminNote;

    appointment.meetingLink =
      input.meetingLink;

    appointment.location =
      input.location;

    await appointment.save();
  } catch (error: unknown) {
    if (
      isDuplicateKeyError(
        error,
      )
    ) {
      throw new AppError(
        "This appointment slot has already been taken.",
        409,
      );
    }

    throw error;
  }

  await sendAppointmentNotificationSafely(
    () =>
      notifyAppointmentAccepted(
        appointment._id.toString(),
      ),
  );

  return appointment.populate([
    "clientId",
    "serviceId",
  ]);
}

/*
|--------------------------------------------------------------------------
| Reject Appointment
|--------------------------------------------------------------------------
*/

export async function rejectAppointment(
  appointmentId: string,
  reason: string,
) {
  const appointment =
    await Appointment.findById(
      appointmentId,
    );

  if (!appointment) {
    throw new AppError(
      "Appointment not found.",
      404,
    );
  }

  if (
    appointment.status !==
    "pending"
  ) {
    throw new AppError(
      "Only pending appointments can be rejected.",
      400,
    );
  }

  appointment.status =
    "rejected";

  appointment.rejectionReason =
    reason;

  appointment.bookingKey =
    undefined;

  await appointment.save();

  await sendAppointmentNotificationSafely(
    () =>
      notifyAppointmentRejected(
        appointment._id.toString(),
        reason,
      ),
  );

  return appointment.populate([
    "clientId",
    "serviceId",
  ]);
}

/*
|--------------------------------------------------------------------------
| Cancel Appointment — Admin
|--------------------------------------------------------------------------
*/

export async function cancelAppointment(
  appointmentId: string,
  reason?: string,
) {
  const appointment =
    await Appointment.findById(
      appointmentId,
    );

  if (!appointment) {
    throw new AppError(
      "Appointment not found.",
      404,
    );
  }

  if (
    ![
      "pending",
      "accepted",
      "rescheduled",
    ].includes(
      appointment.status,
    )
  ) {
    throw new AppError(
      "This appointment cannot be cancelled.",
      400,
    );
  }

  appointment.status =
    "cancelled";

  appointment.cancellationReason =
    reason;

  appointment.cancelledAt =
    new Date();

  appointment.bookingKey =
    undefined;

  await appointment.save();

  await sendAppointmentNotificationSafely(
    () =>
      notifyAppointmentCancelled(
        appointment._id.toString(),
        reason,
      ),
  );

  return appointment.populate([
    "clientId",
    "serviceId",
  ]);
}

/*
|--------------------------------------------------------------------------
| Cancel Appointment — Client
|--------------------------------------------------------------------------
*/

export async function cancelClientAppointment(
  appointmentId: string,
  clientId: string,
  reason?: string,
) {
  await validateClient(
    clientId,
  );

  const appointment =
    await Appointment.findOne({
      _id: appointmentId,
      clientId,
    });

  if (!appointment) {
    throw new AppError(
      "Appointment not found.",
      404,
    );
  }

  if (
    ![
      "pending",
      "accepted",
      "rescheduled",
    ].includes(
      appointment.status,
    )
  ) {
    throw new AppError(
      "This appointment cannot be cancelled.",
      400,
    );
  }

  appointment.status =
    "cancelled";

  appointment.cancellationReason =
    reason;

  appointment.cancelledAt =
    new Date();

  appointment.bookingKey =
    undefined;

  await appointment.save();

  await sendAppointmentNotificationSafely(
    () =>
      notifyAppointmentCancelled(
        appointment._id.toString(),
        reason,
      ),
  );

  return appointment.populate([
    "clientId",
    "serviceId",
  ]);
}

/*
|--------------------------------------------------------------------------
| Reschedule Appointment
|--------------------------------------------------------------------------
*/

export async function rescheduleAppointment(
  input: RescheduleAppointmentInput,
) {
  const appointment =
    await Appointment.findById(
      input.appointmentId,
    );

  if (!appointment) {
    throw new AppError(
      "Appointment not found.",
      404,
    );
  }

  if (
    ![
      "accepted",
      "rescheduled",
    ].includes(
      appointment.status,
    )
  ) {
    throw new AppError(
      "Only active appointments can be rescheduled.",
      400,
    );
  }

  const service =
    await validateService(
      appointment.serviceId.toString(),
    );

  const {
    start,
    end,
  } =
    await validateDateAndAvailability(
      input.requestedDate,
      input.requestedTime,
      service.durationMinutes,
    );

  const conflict =
    await checkScheduleConflict(
      start,
      end,
      appointment.id,
    );

  if (conflict) {
    throw new AppError(
      "The selected time is already occupied.",
      409,
    );
  }

  const bookingKey =
    createBookingKey(
      start,
      end,
    );

  try {
    appointment.requestedDate =
      input.requestedDate;

    appointment.requestedTime =
      input.requestedTime;

    appointment.requestedStart =
      start;

    appointment.requestedEnd =
      end;

    appointment.scheduledStart =
      start;

    appointment.scheduledEnd =
      end;

    appointment.bookingKey =
      bookingKey;

    appointment.status =
      "rescheduled";

    await appointment.save();
  } catch (error: unknown) {
    if (
      isDuplicateKeyError(
        error,
      )
    ) {
      throw new AppError(
        "The selected time is already occupied.",
        409,
      );
    }

    throw error;
  }

  await sendAppointmentNotificationSafely(
    () =>
      notifyAppointmentRescheduled(
        appointment._id.toString(),
      ),
  );

  return appointment.populate([
    "clientId",
    "serviceId",
  ]);
}

/*
|--------------------------------------------------------------------------
| Start Appointment
|--------------------------------------------------------------------------
*/

export async function startAppointment(
  appointmentId: string,
) {
  const appointment =
    await Appointment.findById(
      appointmentId,
    );

  if (!appointment) {
    throw new AppError(
      "Appointment not found.",
      404,
    );
  }

  if (
    ![
      "accepted",
      "rescheduled",
    ].includes(
      appointment.status,
    )
  ) {
    throw new AppError(
      "This appointment cannot be started.",
      400,
    );
  }

  appointment.status =
    "ongoing";

  await appointment.save();

  return appointment.populate([
    "clientId",
    "serviceId",
  ]);
}

/*
|--------------------------------------------------------------------------
| Complete Appointment
|--------------------------------------------------------------------------
*/

export async function completeAppointment(
  appointmentId: string,
) {
  const appointment =
    await Appointment.findById(
      appointmentId,
    );

  if (!appointment) {
    throw new AppError(
      "Appointment not found.",
      404,
    );
  }

  if (
    ![
      "accepted",
      "ongoing",
      "rescheduled",
    ].includes(
      appointment.status,
    )
  ) {
    throw new AppError(
      "This appointment cannot be completed.",
      400,
    );
  }

  appointment.status =
    "completed";

  appointment.completedAt =
    new Date();

  appointment.bookingKey =
    undefined;

  await appointment.save();

  await sendAppointmentNotificationSafely(
    () =>
      notifyAppointmentCompleted(
        appointment._id.toString(),
      ),
  );

  return appointment.populate([
    "clientId",
    "serviceId",
  ]);
}