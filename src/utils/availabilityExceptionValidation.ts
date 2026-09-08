import { z } from "zod";

const timeSchema = z
  .string()
  .trim()
  .regex(
    /^([01]\d|2[0-3]):([0-5]\d)$/,
    "Time must be in HH:mm format.",
  );

const dateSchema = z.coerce.date();

export const createAvailabilityExceptionSchema =
  z
    .object({
      date: dateSchema,

      type: z.enum([
        "blocked",
        "custom",
      ]),

      startTime: timeSchema.optional(),

      endTime: timeSchema.optional(),

      reason: z
        .string()
        .trim()
        .max(500)
        .optional(),

      isActive: z.boolean().optional(),
    })
    .superRefine(
      (data, context) => {
        if (data.type === "custom") {
          if (!data.startTime) {
            context.addIssue({
              code: "custom",
              path: ["startTime"],
              message:
                "Start time is required for custom availability.",
            });
          }

          if (!data.endTime) {
            context.addIssue({
              code: "custom",
              path: ["endTime"],
              message:
                "End time is required for custom availability.",
            });
          }

          if (
            data.startTime &&
            data.endTime &&
            data.startTime >= data.endTime
          ) {
            context.addIssue({
              code: "custom",
              path: ["endTime"],
              message:
                "End time must be later than start time.",
            });
          }
        }

        if (data.type === "blocked") {
          if (
            data.startTime ||
            data.endTime
          ) {
            context.addIssue({
              code: "custom",
              path: ["startTime"],
              message:
                "Blocked dates must not have availability times.",
            });
          }
        }
      },
    );

export const updateAvailabilityExceptionSchema =
  z
    .object({
      date: dateSchema.optional(),

      type: z
        .enum([
          "blocked",
          "custom",
        ])
        .optional(),

      startTime: timeSchema.optional(),

      endTime: timeSchema.optional(),

      reason: z
        .string()
        .trim()
        .max(500)
        .optional(),

      isActive: z.boolean().optional(),
    })
    .superRefine(
      (data, context) => {
        if (
          data.startTime &&
          data.endTime &&
          data.startTime >= data.endTime
        ) {
          context.addIssue({
            code: "custom",
            path: ["endTime"],
            message:
              "End time must be later than start time.",
          });
        }
      },
    );

export const availabilityExceptionIdSchema =
  z.object({
    id: z
      .string()
      .min(
        1,
        "Availability exception ID is required.",
      ),
  });