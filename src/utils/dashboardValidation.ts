import { z } from "zod";

const dateSchema = z
  .string()
  .trim()
  .regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "Date must use YYYY-MM-DD format.",
  );

export const dashboardDateRangeSchema =
  z
    .object({
      from: dateSchema.optional(),
      to: dateSchema.optional(),
    })
    .refine(
      (data) => {
        if (
          !data.from ||
          !data.to
        ) {
          return true;
        }

        return data.from <= data.to;
      },
      {
        message:
          "The start date cannot be after the end date.",
        path: ["from"],
      },
    );