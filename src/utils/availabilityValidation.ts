import { z } from "zod";

const timeSchema = z
  .string()
  .trim()
  .regex(
    /^([01]\d|2[0-3]):([0-5]\d)$/,
    "Time must be in HH:mm format",
  );

const dayOfWeekSchema = z.enum([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
]);

export const createAvailabilitySchema = z
  .object({
    dayOfWeek: dayOfWeekSchema,

    startTime: timeSchema,

    endTime: timeSchema,

    isActive: z.boolean().optional(),
  })
  .refine(
    ({ startTime, endTime }) =>
      startTime < endTime,
    {
      message:
        "End time must be later than start time.",
      path: ["endTime"],
    },
  );

export const updateAvailabilitySchema = z
  .object({
    dayOfWeek: dayOfWeekSchema.optional(),

    startTime: timeSchema.optional(),

    endTime: timeSchema.optional(),

    isActive: z.boolean().optional(),
  })
  .refine(
    ({ startTime, endTime }) => {
      if (
        startTime === undefined ||
        endTime === undefined
      ) {
        return true;
      }

      return startTime < endTime;
    },
    {
      message:
        "End time must be later than start time.",
      path: ["endTime"],
    },
  );

export const availabilityIdSchema = z.object({
  id: z.string().min(1, "Availability ID is required"),
});