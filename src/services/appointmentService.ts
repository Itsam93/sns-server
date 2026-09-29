import mongoose, {
  type ClientSession,
  type HydratedDocument,
} from "mongoose";

import {
  Appointment,
  type IAppointment,
} from "../models/Appointment.js";
import {
  Availability,
  type DayOfWeek,
} from "../models/Availability.js";
import { AvailabilityException } from "../models/AvailabilityException.js";
import { Client } from "../models/Client.js";
import { Service } from "../models/Service.js";
import {
  ServicePackage,
  type IServicePackage,
} from "../models/ServicePackage.js";
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
  servicePackageId: string;
  requestedDate: Date;
  requestedTime: string;
  sessionType: SessionType;
};

type CreateAppointmentFromPaymentInput = {
  paymentId: string;
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

type AppointmentDocument =
  HydratedDocument<IAppointment>;

function getDayOfWeek(
  date: Date,
): DayOfWeek | null {
  const days: Array<DayOfWeek | null> = [
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
): boolean {
  const day = date.getDay();

  return day === 0 || day === 6;
}

function validateTimeFormat(
  time: string,
): void {
  if (
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(
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
): Date {
  validateTimeFormat(time);

  const [
    hoursText,
    minutesText,
  ] = time.split(":");

  if (!hoursText || !minutesText) {
    throw new AppError(
      "Invalid appointment time.",
      400,
    );
  }

  const result = new Date(date);

  result.setHours(
    Number(hoursText),
    Number(minutesText),
    0,
    0,
  );

  return result;
}

function addMinutes(
  date: Date,
  minutes: number,
): Date {
  return new Date(
    date.getTime() +
      minutes * 60 * 1000,
  );
}

function normalizeDate(
  date: Date,
): Date {
  const result = new Date(date);

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
  const start = normalizeDate(date);

  const end = new Date(start);

  end.setDate(
    end.getDate() + 1,
  );

  return {
    start,
    end,
  };
}

function normalizeDateInput(
  date: Date,
): Date {
  if (
    !(date instanceof Date) ||
    Number.isNaN(date.getTime())
  ) {
    throw new AppError(
      "Invalid appointment date.",
      400,
    );
  }

  return normalizeDate(date);
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
    if (exception.type === "blocked") {
      return [];
    }

    if (
      exception.type === "custom" &&
      exception.startTime &&
      exception.endTime
    ) {
      return [
        {
          startTime: exception.startTime,
          endTime: exception.endTime,
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
      startTime: item.startTime,
      endTime: item.endTime,
    }),
  );
}

async function validateClient(
  clientId: string,
) {
  if (
    !mongoose.Types.ObjectId.isValid(
      clientId,
    )
  ) {
    throw new AppError(
      "Invalid client ID.",
      400,
    );
  }

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
  if (
    !mongoose.Types.ObjectId.isValid(
      serviceId,
    )
  ) {
    throw new AppError(
      "Invalid service ID.",
      400,
    );
  }

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

  if (
    !Number.isInteger(
      service.durationMinutes,
    ) ||
    service.durationMinutes <= 0
  ) {
    throw new AppError(
      "The selected service has an invalid duration.",
      500,
    );
  }

  return service;
}

async function validateServicePackage(
  servicePackageId: string,
  clientId: string,
  serviceId: string,
  session?: ClientSession,
): Promise<
  HydratedDocument<IServicePackage>
> {
  if (
    !mongoose.Types.ObjectId.isValid(
      servicePackageId,
    )
  ) {
    throw new AppError(
      "Invalid service package ID.",
      400,
    );
  }

  const query =
    ServicePackage.findOne({
      _id: servicePackageId,
      clientId,
      serviceId,
    });

  if (session) {
    query.session(session);
  }

  const servicePackage =
    await query;

  if (!servicePackage) {
    throw new AppError(
      "The selected service package was not found or does not belong to this service.",
      404,
    );
  }

  if (
    servicePackage.status !==
    "active"
  ) {
    throw new AppError(
      "The selected service package is not active.",
      409,
    );
  }

  if (
    servicePackage.remainingSessions <=
    0
  ) {
    throw new AppError(
      "The selected service package has no remaining sessions.",
      409,
    );
  }

  if (
    servicePackage.expiresAt &&
    servicePackage.expiresAt.getTime() <=
      Date.now()
  ) {
    throw new AppError(
      "The selected service package has expired.",
      409,
    );
  }

  return servicePackage;
}

async function validateDateAndAvailability(
  date: Date,
  time: string,
  durationMinutes: number,
) {
  const normalizedDate =
    normalizeDateInput(date);

  if (isWeekend(normalizedDate)) {
    throw new AppError(
      "Appointments are only available from Monday to Friday.",
      400,
    );
  }

  if (
    !Number.isInteger(
      durationMinutes,
    ) ||
    durationMinutes <= 0
  ) {
    throw new AppError(
      "The selected service has an invalid duration.",
      500,
    );
  }

  const start =
    combineDateAndTime(
      normalizedDate,
      time,
    );

  const end =
    addMinutes(
      start,
      durationMinutes,
    );

  if (start <= new Date()) {
    throw new AppError(
      "Appointment time must be in the future.",
      400,
    );
  }

  const schedule =
    await getScheduleForDate(
      normalizedDate,
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
            normalizedDate,
            window.startTime,
          );

        const windowEnd =
          combineDateAndTime(
            normalizedDate,
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
    date: normalizedDate,
    start,
    end,
  };
}

function getConflictQuery(
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
        status: "pending",
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
        status: {
          $in: [
            "accepted",
            "ongoing",
            "rescheduled",
          ],
        },
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

  return query;
}

async function checkScheduleConflict(
  start: Date,
  end: Date,
  excludeAppointmentId?: string,
  session?: ClientSession,
) {
  const request =
    Appointment.findOne(
      getConflictQuery(
        start,
        end,
        excludeAppointmentId,
      ),
    );

  if (session) {
    request.session(session);
  }

  return request;
}

function createBookingKey(
  start: Date,
  end: Date,
): string {
  return `${start.getTime()}-${end.getTime()}`;
}

function createActiveBookingKey(
  clientId: string,
): string {
  return clientId;
}

function isDuplicateKeyError(
  error: unknown,
): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

function getDuplicateKeyFields(
  error: unknown,
): Record<
  string,
  unknown
> | null {
  if (
    typeof error !== "object" ||
    error === null ||
    !("keyPattern" in error)
  ) {
    return null;
  }

  const keyPattern =
    error.keyPattern;

  if (
    typeof keyPattern !== "object" ||
    keyPattern === null
  ) {
    return null;
  }

  return keyPattern as Record<
    string,
    unknown
  >;
}

async function sendAppointmentNotificationSafely(
  notification: () => Promise<unknown>,
): Promise<void> {
  try {
    await notification();
  } catch (error) {
    console.error(
      "Appointment notification failed:",
      error,
    );
  }
}

function getActiveBookingKey(
  appointment: IAppointment,
): string {
  return createActiveBookingKey(
    appointment.clientId.toString(),
  );
}

function clearActiveBooking(
  appointment: IAppointment,
): void {
  appointment.activeBookingKey =
    undefined;
}

function clearAppointmentSlot(
  appointment: IAppointment,
): void {
  appointment.bookingKey =
    undefined;

  clearActiveBooking(
    appointment,
  );
}

/*
|--------------------------------------------------------------------------
| Booking Eligibility
|--------------------------------------------------------------------------
*/

export async function canClientBook(
  clientId: string,
) {
  await validateClient(clientId);

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
    reason: "ACTIVE_APPOINTMENT",
  };
}

/*
|--------------------------------------------------------------------------
| Create Appointment
|--------------------------------------------------------------------------
*/

export async function createAppointment(
  input: CreateAppointmentInput,
): Promise<AppointmentDocument> {
  await validateClient(
    input.clientId,
  );

  const service =
    await validateService(
      input.serviceId,
    );

  const {
    date,
    start,
    end,
  } =
    await validateDateAndAvailability(
      input.requestedDate,
      input.requestedTime,
      service.durationMinutes,
    );

  const bookingKey =
    createBookingKey(
      start,
      end,
    );

  const activeBookingKey =
    createActiveBookingKey(
      input.clientId,
    );

  const session =
    await mongoose.startSession();

  let appointmentId: string | null =
    null;

  try {
    await session.withTransaction(
      async () => {
        const existingActiveAppointment =
          await Appointment.findOne({
            clientId:
              input.clientId,
            status: {
              $in:
                ACTIVE_APPOINTMENT_STATUSES,
            },
          })
            .session(session)
            .select("_id");

        if (
          existingActiveAppointment
        ) {
          throw new AppError(
            "You already have an active appointment and cannot book another session.",
            409,
          );
        }

        await validateServicePackage(
          input.servicePackageId,
          input.clientId,
          input.serviceId,
          session,
        );

        const conflict =
          await checkScheduleConflict(
            start,
            end,
            undefined,
            session,
          );

        if (conflict) {
          throw new AppError(
            "The selected time is no longer available.",
            409,
          );
        }

        const createdAppointment =
          new Appointment({
            clientId:
              input.clientId,
            serviceId:
              input.serviceId,
            servicePackageId:
              input.servicePackageId,
            requestedDate:
              date,
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
            activeBookingKey,
          });

        await createdAppointment.save({
          session,
        });

        appointmentId =
          createdAppointment._id.toString();
      },
    );
  } catch (error: unknown) {
    if (
      isDuplicateKeyError(error)
    ) {
      const duplicateFields =
        getDuplicateKeyFields(
          error,
        );

      if (
        duplicateFields &&
        "activeBookingKey" in
          duplicateFields
      ) {
        throw new AppError(
          "You already have an active appointment and cannot book another session.",
          409,
        );
      }

      throw new AppError(
        "The selected time is no longer available.",
        409,
      );
    }

    throw error;
  } finally {
    await session.endSession();
  }

  if (!appointmentId) {
    throw new AppError(
      "Unable to create the appointment.",
      500,
    );
  }

  await sendAppointmentNotificationSafely(
    () =>
      notifyAppointmentCreated(
        appointmentId!,
      ),
  );

  const appointment =
    await Appointment.findById(
      appointmentId,
    )
      .populate("clientId")
      .populate("serviceId")
      .populate("servicePackageId");

  if (!appointment) {
    throw new AppError(
      "Appointment not found after creation.",
      500,
    );
  }

  return appointment;
}

/*
|--------------------------------------------------------------------------
| Create Appointment From Successful Service Payment
|--------------------------------------------------------------------------
*/

export async function createAppointmentFromPayment(
  input: CreateAppointmentFromPaymentInput,
): Promise<AppointmentDocument> {
  if (
    !mongoose.Types.ObjectId.isValid(
      input.paymentId,
    )
  ) {
    throw new AppError(
      "Invalid payment ID.",
      400,
    );
  }

  if (
    !mongoose.Types.ObjectId.isValid(
      input.clientId,
    )
  ) {
    throw new AppError(
      "Invalid client ID.",
      400,
    );
  }

  if (
    !mongoose.Types.ObjectId.isValid(
      input.serviceId,
    )
  ) {
    throw new AppError(
      "Invalid service ID.",
      400,
    );
  }

  const existingServicePackage =
    await ServicePackage.findOne({
      paymentId:
        input.paymentId,
    });

  if (existingServicePackage) {
    if (
      existingServicePackage.clientId.toString() !==
        input.clientId ||
      existingServicePackage.serviceId.toString() !==
        input.serviceId
    ) {
      throw new AppError(
        "The payment is not associated with the requested service.",
        409,
      );
    }

    const existingAppointment =
      await Appointment.findOne({
        servicePackageId:
          existingServicePackage._id,
        clientId:
          input.clientId,
        serviceId:
          input.serviceId,
      }).sort({
        createdAt: -1,
      });

    if (existingAppointment) {
      const populatedAppointment =
        await Appointment.findById(
          existingAppointment._id,
        )
          .populate("clientId")
          .populate("serviceId")
          .populate("servicePackageId");

      if (!populatedAppointment) {
        throw new AppError(
          "Appointment not found after payment fulfilment.",
          500,
        );
      }

      return populatedAppointment;
    }

    if (
      existingServicePackage.status !==
      "active"
    ) {
      throw new AppError(
        "The service package associated with this payment is not active.",
        409,
      );
    }

    if (
      existingServicePackage.remainingSessions <=
      0
    ) {
      throw new AppError(
        "The service package associated with this payment has no remaining sessions.",
        409,
      );
    }
  }

  await validateClient(
    input.clientId,
  );

  const service =
    await validateService(
      input.serviceId,
    );

  const {
    date,
    start,
    end,
  } =
    await validateDateAndAvailability(
      input.requestedDate,
      input.requestedTime,
      service.durationMinutes,
    );

  let totalSessions = 1;

  if (
    service.type ===
    "session_package"
  ) {
    const sessionCount =
      service.sessionCount;

    if (
      sessionCount ===
        undefined ||
      !Number.isInteger(
        sessionCount,
      ) ||
      sessionCount <= 0
    ) {
      throw new AppError(
        "The selected service does not have a valid session count.",
        500,
      );
    }

    totalSessions =
      sessionCount;
  }

  const bookingKey =
    createBookingKey(
      start,
      end,
    );

  const activeBookingKey =
    createActiveBookingKey(
      input.clientId,
    );

  const session =
    await mongoose.startSession();

  let appointmentId: string | null =
    null;

  try {
    await session.withTransaction(
      async () => {
        const paymentServicePackage =
          await ServicePackage.findOne({
            paymentId:
              input.paymentId,
          }).session(session);

        if (
          paymentServicePackage
        ) {
          if (
            paymentServicePackage.clientId.toString() !==
              input.clientId ||
            paymentServicePackage.serviceId.toString() !==
              input.serviceId
          ) {
            throw new AppError(
              "The payment is not associated with the requested service.",
              409,
            );
          }

          const existingAppointment =
            await Appointment.findOne({
              servicePackageId:
                paymentServicePackage._id,
              clientId:
                input.clientId,
              serviceId:
                input.serviceId,
            })
              .session(session)
              .sort({
                createdAt: -1,
              });

          if (
            existingAppointment
          ) {
            appointmentId =
              existingAppointment._id.toString();

            return;
          }

          if (
            paymentServicePackage.status !==
            "active"
          ) {
            throw new AppError(
              "The service package associated with this payment is not active.",
              409,
            );
          }

          if (
            paymentServicePackage.remainingSessions <=
            0
          ) {
            throw new AppError(
              "The service package associated with this payment has no remaining sessions.",
              409,
            );
          }
        }

        const existingActiveAppointment =
          await Appointment.findOne({
            clientId:
              input.clientId,
            status: {
              $in:
                ACTIVE_APPOINTMENT_STATUSES,
            },
          })
            .session(session)
            .select("_id");

        if (
          existingActiveAppointment
        ) {
          throw new AppError(
            "You already have an active appointment and cannot book another session.",
            409,
          );
        }

        const conflict =
          await checkScheduleConflict(
            start,
            end,
            undefined,
            session,
          );

        if (conflict) {
          throw new AppError(
            "The selected time is no longer available.",
            409,
          );
        }

        let servicePackage =
          paymentServicePackage;

        if (!servicePackage) {
          servicePackage =
            new ServicePackage({
              clientId:
                input.clientId,
              serviceId:
                input.serviceId,
              paymentId:
                input.paymentId,
              totalSessions,
              usedSessions: 0,
              remainingSessions:
                totalSessions,
              status: "active",
              purchasedAt:
                new Date(),
            });

          await servicePackage.save({
            session,
          });
        }

        const createdAppointment =
          new Appointment({
            clientId:
              input.clientId,
            serviceId:
              input.serviceId,
            servicePackageId:
              servicePackage._id,
            requestedDate:
              date,
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
            activeBookingKey,
          });

        await createdAppointment.save({
          session,
        });

        appointmentId =
          createdAppointment._id.toString();
      },
    );
  } catch (error: unknown) {
    if (
      isDuplicateKeyError(error)
    ) {
      const duplicateFields =
        getDuplicateKeyFields(
          error,
        );

      if (
        duplicateFields &&
        "paymentId" in
          duplicateFields
      ) {
        const duplicateServicePackage =
          await ServicePackage.findOne({
            paymentId:
              input.paymentId,
          });

        if (
          duplicateServicePackage &&
          duplicateServicePackage.clientId.toString() ===
            input.clientId &&
          duplicateServicePackage.serviceId.toString() ===
            input.serviceId
        ) {
          const existingAppointment =
            await Appointment.findOne({
              servicePackageId:
                duplicateServicePackage._id,
              clientId:
                input.clientId,
              serviceId:
                input.serviceId,
            })
              .sort({
                createdAt: -1,
              });

          if (
            existingAppointment
          ) {
            appointmentId =
              existingAppointment._id.toString();
          }
        }

        if (appointmentId) {
          return await (async () => {
            await sendAppointmentNotificationSafely(
              async () => undefined,
            );

            return Appointment.findById(
              appointmentId!,
            )
              .populate("clientId")
              .populate("serviceId")
              .populate("servicePackageId");
          })().then(
            (appointment) => {
              if (!appointment) {
                throw new AppError(
                  "Appointment not found after payment fulfilment.",
                  500,
                );
              }

              return appointment;
            },
          );
        }

        throw new AppError(
          "The payment has already been associated with another fulfilment record.",
          409,
        );
      }

      if (
        duplicateFields &&
        "activeBookingKey" in
          duplicateFields
      ) {
        throw new AppError(
          "You already have an active appointment and cannot book another session.",
          409,
        );
      }

      if (
        duplicateFields &&
        "bookingKey" in
          duplicateFields
      ) {
        throw new AppError(
          "The selected time is no longer available.",
          409,
        );
      }

      throw new AppError(
        "The appointment could not be created because a conflicting record already exists.",
        409,
      );
    }

    throw error;
  } finally {
    await session.endSession();
  }

  if (!appointmentId) {
    throw new AppError(
      "Unable to create the appointment from the successful payment.",
      500,
    );
  }

  await sendAppointmentNotificationSafely(
    () =>
      notifyAppointmentCreated(
        appointmentId!,
      ),
  );

  const appointment =
    await Appointment.findById(
      appointmentId,
    )
      .populate("clientId")
      .populate("serviceId")
      .populate("servicePackageId");

  if (!appointment) {
    throw new AppError(
      "Appointment not found after payment fulfilment.",
      500,
    );
  }

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
  await validateClient(clientId);

  return Appointment.find({
    clientId,
  })
    .populate("clientId")
    .populate("serviceId")
    .populate("servicePackageId")
    .sort({
      createdAt: -1,
    });
}

export async function getClientAppointmentById(
  appointmentId: string,
  clientId: string,
) {
  await validateClient(clientId);

  const appointment =
    await Appointment.findOne({
      _id: appointmentId,
      clientId,
    })
      .populate("clientId")
      .populate("serviceId")
      .populate("servicePackageId");

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
      .populate("serviceId")
      .populate("servicePackageId");

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
    .populate("servicePackageId")
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

  const session =
    await mongoose.startSession();

  try {
    await session.withTransaction(
      async () => {
        const currentAppointment =
          await Appointment.findOne({
            _id:
              input.appointmentId,
            status: "pending",
          }).session(session);

        if (!currentAppointment) {
          throw new AppError(
            "Only pending appointments can be accepted.",
            409,
          );
        }

        const conflict =
          await checkScheduleConflict(
            start,
            end,
            input.appointmentId,
            session,
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

        currentAppointment.scheduledStart =
          start;

        currentAppointment.scheduledEnd =
          end;

        currentAppointment.bookingKey =
          bookingKey;

        currentAppointment.activeBookingKey =
          getActiveBookingKey(
            currentAppointment,
          );

        currentAppointment.status =
          "accepted";

        currentAppointment.acceptedAt =
          new Date();

        currentAppointment.adminNote =
          input.adminNote?.trim() ||
          undefined;

        currentAppointment.meetingLink =
          input.meetingLink?.trim() ||
          undefined;

        currentAppointment.location =
          input.location?.trim() ||
          undefined;

        await currentAppointment.save({
          session,
        });
      },
    );
  } catch (error: unknown) {
    if (
      isDuplicateKeyError(error)
    ) {
      const duplicateFields =
        getDuplicateKeyFields(
          error,
        );

      if (
        duplicateFields &&
        "activeBookingKey" in
          duplicateFields
      ) {
        throw new AppError(
          "This client already has another active appointment.",
          409,
        );
      }

      throw new AppError(
        "This appointment slot has already been taken.",
        409,
      );
    }

    throw error;
  } finally {
    await session.endSession();
  }

  const updatedAppointment =
    await Appointment.findById(
      input.appointmentId,
    )
      .populate("clientId")
      .populate("serviceId")
      .populate("servicePackageId");

  if (!updatedAppointment) {
    throw new AppError(
      "Appointment not found after acceptance.",
      500,
    );
  }

  await sendAppointmentNotificationSafely(
    () =>
      notifyAppointmentAccepted(
        updatedAppointment._id.toString(),
      ),
  );

  return updatedAppointment;
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
  const trimmedReason =
    reason.trim();

  if (!trimmedReason) {
    throw new AppError(
      "A rejection reason is required.",
      400,
    );
  }

  const appointment =
    await Appointment.findOne({
      _id: appointmentId,
      status: "pending",
    });

  if (!appointment) {
    const existing =
      await Appointment.findById(
        appointmentId,
      );

    if (!existing) {
      throw new AppError(
        "Appointment not found.",
        404,
      );
    }

    throw new AppError(
      "Only pending appointments can be rejected.",
      400,
    );
  }

  appointment.status =
    "rejected";

  appointment.rejectionReason =
    trimmedReason;

  clearAppointmentSlot(
    appointment,
  );

  await appointment.save();

  await sendAppointmentNotificationSafely(
    () =>
      notifyAppointmentRejected(
        appointment._id.toString(),
        trimmedReason,
      ),
  );

  return Appointment.findById(
    appointment._id,
  )
    .populate("clientId")
    .populate("serviceId")
    .populate("servicePackageId");
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
    reason?.trim() ||
    undefined;

  appointment.cancelledAt =
    new Date();

  clearAppointmentSlot(
    appointment,
  );

  await appointment.save();

  await sendAppointmentNotificationSafely(
    () =>
      notifyAppointmentCancelled(
        appointment._id.toString(),
        reason,
        "client",
      ),
  );

  return Appointment.findById(
    appointment._id,
  )
    .populate("clientId")
    .populate("serviceId")
    .populate("servicePackageId");
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
  await validateClient(clientId);

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
    reason?.trim() ||
    undefined;

  appointment.cancelledAt =
    new Date();

  clearAppointmentSlot(
    appointment,
  );

  await appointment.save();

  await sendAppointmentNotificationSafely(
    () =>
      notifyAppointmentCancelled(
        appointment._id.toString(),
        reason,
        "admin",
      ),
  );

  return Appointment.findById(
    appointment._id,
  )
    .populate("clientId")
    .populate("serviceId")
    .populate("servicePackageId");
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
    date,
    start,
    end,
  } =
    await validateDateAndAvailability(
      input.requestedDate,
      input.requestedTime,
      service.durationMinutes,
    );

  const session =
    await mongoose.startSession();

  try {
    await session.withTransaction(
      async () => {
        const currentAppointment =
          await Appointment.findOne({
            _id:
              input.appointmentId,
            status: {
              $in: [
                "accepted",
                "rescheduled",
              ],
            },
          }).session(session);

        if (!currentAppointment) {
          throw new AppError(
            "Only active appointments can be rescheduled.",
            409,
          );
        }

        const conflict =
          await checkScheduleConflict(
            start,
            end,
            input.appointmentId,
            session,
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

        currentAppointment.requestedDate =
          date;

        currentAppointment.requestedTime =
          input.requestedTime;

        currentAppointment.requestedStart =
          start;

        currentAppointment.requestedEnd =
          end;

        currentAppointment.scheduledStart =
          start;

        currentAppointment.scheduledEnd =
          end;

        currentAppointment.bookingKey =
          bookingKey;

        currentAppointment.activeBookingKey =
          getActiveBookingKey(
            currentAppointment,
          );

        currentAppointment.status =
          "rescheduled";

        await currentAppointment.save({
          session,
        });
      },
    );
  } catch (error: unknown) {
    if (
      isDuplicateKeyError(error)
    ) {
      const duplicateFields =
        getDuplicateKeyFields(
          error,
        );

      if (
        duplicateFields &&
        "activeBookingKey" in
          duplicateFields
      ) {
        throw new AppError(
          "This client already has another active appointment.",
          409,
        );
      }

      throw new AppError(
        "The selected time is already occupied.",
        409,
      );
    }

    throw error;
  } finally {
    await session.endSession();
  }

  const updatedAppointment =
    await Appointment.findById(
      input.appointmentId,
    )
      .populate("clientId")
      .populate("serviceId")
      .populate("servicePackageId");

  if (!updatedAppointment) {
    throw new AppError(
      "Appointment not found after rescheduling.",
      500,
    );
  }

  await sendAppointmentNotificationSafely(
    () =>
      notifyAppointmentRescheduled(
        updatedAppointment._id.toString(),
      ),
  );

  return updatedAppointment;
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
    await Appointment.findOneAndUpdate(
      {
        _id: appointmentId,
        status: {
          $in: [
            "accepted",
            "rescheduled",
          ],
        },
      },
      {
        $set: {
          status: "ongoing",
        },
      },
      {
        new: true,
        runValidators: true,
      },
    )
      .populate("clientId")
      .populate("serviceId")
      .populate("servicePackageId");

  if (!appointment) {
    const existing =
      await Appointment.findById(
        appointmentId,
      );

    if (!existing) {
      throw new AppError(
        "Appointment not found.",
        404,
      );
    }

    throw new AppError(
      "This appointment cannot be started.",
      400,
    );
  }

  return appointment;
}

/*
|--------------------------------------------------------------------------
| Complete Appointment
|--------------------------------------------------------------------------
*/

async function consumeServicePackageSession(
  appointment: AppointmentDocument,
  session: ClientSession,
): Promise<void> {
  if (
    !appointment.servicePackageId
  ) {
    throw new AppError(
      "This appointment is not linked to a service package.",
      409,
    );
  }

  const now = new Date();

  const servicePackage =
    await ServicePackage.findOneAndUpdate(
      {
        _id:
          appointment.servicePackageId,
        clientId:
          appointment.clientId,
        serviceId:
          appointment.serviceId,
        status: "active",
        remainingSessions: {
          $gt: 0,
        },
        $or: [
          {
            expiresAt: {
              $exists: false,
            },
          },
          {
            expiresAt: null,
          },
          {
            expiresAt: {
              $gt: now,
            },
          },
        ],
      },
      [
        {
          $set: {
            usedSessions: {
              $add: [
                "$usedSessions",
                1,
              ],
            },
            remainingSessions: {
              $subtract: [
                "$remainingSessions",
                1,
              ],
            },
            lastUsedAt: now,
          },
        },
        {
          $set: {
            status: {
              $cond: [
                {
                  $eq: [
                    "$remainingSessions",
                    0,
                  ],
                },
                "completed",
                "active",
              ],
            },
          },
        },
      ],
      {
        new: true,
        session,
      },
    );

  if (!servicePackage) {
    throw new AppError(
      "The service package has no available session or has expired.",
      409,
    );
  }
}

export async function completeAppointment(
  appointmentId: string,
) {
  const session =
    await mongoose.startSession();

  let completedAppointmentId:
    | string
    | null = null;

  try {
    await session.withTransaction(
      async () => {
        const currentAppointment =
          await Appointment.findOne({
            _id: appointmentId,
            status: {
              $in: [
                "accepted",
                "ongoing",
                "rescheduled",
              ],
            },
          }).session(session);

        if (!currentAppointment) {
          const existing =
            await Appointment.findById(
              appointmentId,
            ).session(session);

          if (!existing) {
            throw new AppError(
              "Appointment not found.",
              404,
            );
          }

          throw new AppError(
            "This appointment cannot be completed.",
            400,
          );
        }

        await consumeServicePackageSession(
          currentAppointment,
          session,
        );

        currentAppointment.status =
          "completed";

        currentAppointment.completedAt =
          new Date();

        clearAppointmentSlot(
          currentAppointment,
        );

        await currentAppointment.save({
          session,
        });

        completedAppointmentId =
          currentAppointment._id.toString();
      },
    );
  } finally {
    await session.endSession();
  }

  if (!completedAppointmentId) {
    throw new AppError(
      "Unable to complete the appointment.",
      500,
    );
  }

  await sendAppointmentNotificationSafely(
    () =>
      notifyAppointmentCompleted(
        completedAppointmentId!,
      ),
  );

  const appointment =
    await Appointment.findById(
      completedAppointmentId,
    )
      .populate("clientId")
      .populate("serviceId")
      .populate("servicePackageId");

  if (!appointment) {
    throw new AppError(
      "Appointment not found after completion.",
      500,
    );
  }

  return appointment;
}