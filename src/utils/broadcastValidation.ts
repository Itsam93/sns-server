import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(
    /^[0-9a-fA-F]{24}$/,
    "Invalid client ID.",
  );

export const createBroadcastSchema =
  z
    .object({
      title: z
        .string()
        .trim()
        .min(
          1,
          "Broadcast title is required.",
        )
        .max(
          200,
          "Broadcast title cannot exceed 200 characters.",
        ),

      message: z
        .string()
        .trim()
        .min(
          1,
          "Broadcast message is required.",
        )
        .max(
          10000,
          "Broadcast message cannot exceed 10,000 characters.",
        ),

      recipientType: z.enum([
        "all",
        "selected",
      ]),

      clientIds: z
        .array(objectIdSchema)
        .max(
          1000,
          "You cannot select more than 1,000 clients.",
        )
        .optional(),
    })
    .superRefine(
      (data, ctx) => {
        if (
          data.recipientType ===
            "selected" &&
          (!data.clientIds ||
            data.clientIds.length === 0)
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["clientIds"],
            message:
              "Select at least one client.",
          });
        }

        if (
          data.recipientType === "all" &&
          data.clientIds &&
          data.clientIds.length > 0
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["clientIds"],
            message:
              "Client IDs must not be provided when sending to all clients.",
          });
        }
      },
    );

export type CreateBroadcastInput =
  z.infer<
    typeof createBroadcastSchema
  >;