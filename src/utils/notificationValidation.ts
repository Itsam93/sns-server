import { z } from "zod";

const notificationTypeSchema =
  z.enum([
    "appointment",
    "intake",
    "workshop",
    "system",
  ]);

const titleSchema = z
  .string()
  .trim()
  .min(1, "Notification title is required.")
  .max(
    200,
    "Notification title must not exceed 200 characters.",
  );

const messageSchema = z
  .string()
  .trim()
  .min(1, "Notification message is required.")
  .max(
    2000,
    "Notification message must not exceed 2000 characters.",
  );

const linkSchema = z
  .string()
  .trim()
  .max(
    1000,
    "Notification link must not exceed 1000 characters.",
  )
  .optional();

export const createNotificationSchema =
  z.object({
    userId: z
      .string()
      .trim()
      .min(
        1,
        "User ID is required.",
      ),

    type: notificationTypeSchema,

    title: titleSchema,

    message: messageSchema,

    link: linkSchema,
  });

export const markNotificationReadSchema =
  z.object({
    isRead: z.literal(true),
  });

export const notificationIdSchema =
  z.object({
    id: z
      .string()
      .trim()
      .min(
        1,
        "Notification ID is required.",
      ),
  });