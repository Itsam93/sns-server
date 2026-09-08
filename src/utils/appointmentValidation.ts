import { z } from "zod";

const objectIdSchema = z
  .string()
  .trim()
  .regex(
    /^[a-f\d]{24}$/i,
    "Invalid ID format.",
  );

const timeSchema = z
  .string()
  .trim()
  .regex(
    /^([01]\d|2[0-3]):([0-5]\d)$/,
    "Time must be in HH:mm format.",
  );

const appointmentDateSchema = z
  .coerce
  .date()
  .refine(
    (date) =>
      !Number.isNaN(
        date.getTime(),
      ),
    {
      message:
        "Appointment date must be a valid date.",
    },
  );

const sessionTypeSchema =
  z.enum([
    "in_person",
    "online",
    "phone",
  ]);

const optionalTextSchema = (
  max: number,
) =>
  z
    .string()
    .trim()
    .max(max)
    .optional();

export const createAppointmentSchema =
  z.object({
    serviceId:
      objectIdSchema,

    requestedDate:
      appointmentDateSchema,

    requestedTime:
      timeSchema,

    sessionType:
      sessionTypeSchema,
  });

export const rejectAppointmentSchema =
  z.object({
    reason: z
      .string()
      .trim()
      .min(
        1,
        "Rejection reason is required.",
      )
      .max(
        1000,
        "Rejection reason must not exceed 1000 characters.",
      ),
  });

export const cancelAppointmentSchema =
  z.object({
    reason:
      optionalTextSchema(1000),
  });

export const rescheduleAppointmentSchema =
  z.object({
    requestedDate:
      appointmentDateSchema,

    requestedTime:
      timeSchema,
  });

export const acceptAppointmentSchema =
  z.object({
    scheduledDate:
      appointmentDateSchema,

    scheduledTime:
      timeSchema,

    adminNote:
      optionalTextSchema(2000),

    meetingLink: z
      .string()
      .trim()
      .url(
        "Meeting link must be a valid URL.",
      )
      .max(
        2000,
        "Meeting link must not exceed 2000 characters.",
      )
      .optional(),

    location:
      optionalTextSchema(500),
  });