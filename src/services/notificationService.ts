import mongoose from "mongoose";

import {
  Notification,
  type NotificationType,
} from "../models/Notification.js";
import {
  sendEmail,
} from "./emailService.js";
import { AppError } from "../utils/appError.js";

type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
};

type SendNotificationInput =
  CreateNotificationInput & {
    email?: string;
    emailSubject?: string;
    emailHtml?: string;
  };

const NOTIFICATION_TYPES:
  NotificationType[] = [
    "appointment",
    "intake",
    "workshop",
    "system",
  ];

function validateObjectId(
  id: string,
  fieldName: string,
) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(
      `Invalid ${fieldName}.`,
      400,
    );
  }
}

function validateNotificationType(
  type: NotificationType,
) {
  if (
    !NOTIFICATION_TYPES.includes(
      type,
    )
  ) {
    throw new AppError(
      "Invalid notification type.",
      400,
    );
  }
}

function normalizeText(
  value: string,
) {
  return value.trim();
}

export async function createNotification(
  data: CreateNotificationInput,
) {
  validateObjectId(
    data.userId,
    "user ID",
  );

  validateNotificationType(
    data.type,
  );

  const title =
    normalizeText(data.title);

  const message =
    normalizeText(data.message);

  if (!title) {
    throw new AppError(
      "Notification title is required.",
      400,
    );
  }

  if (!message) {
    throw new AppError(
      "Notification message is required.",
      400,
    );
  }

  return Notification.create({
    userId:
      data.userId,
    type:
      data.type,
    title,
    message,
    link:
      data.link
        ? normalizeText(
            data.link,
          )
        : undefined,
  });
}

export async function createNotificationAndEmail(
  data: SendNotificationInput,
) {
  const notification =
    await createNotification(
      data,
    );

  if (
    data.email &&
    data.email.trim()
  ) {
    try {
      await sendEmail({
        to:
          data.email.trim(),
        subject:
          data.emailSubject?.trim() ||
          data.title.trim(),
        text:
          data.message.trim(),
        html:
          data.emailHtml,
      });
    } catch (error) {
      console.error(
        "Notification email delivery failed:",
        error,
      );
    }
  }

  return notification;
}

export async function getUserNotifications(
  userId: string,
) {
  validateObjectId(
    userId,
    "user ID",
  );

  return Notification.find({
    userId,
  }).sort({
    createdAt: -1,
  });
}

export async function getUnreadNotifications(
  userId: string,
) {
  validateObjectId(
    userId,
    "user ID",
  );

  return Notification.find({
    userId,
    isRead: false,
  }).sort({
    createdAt: -1,
  });
}

export async function getUnreadNotificationCount(
  userId: string,
) {
  validateObjectId(
    userId,
    "user ID",
  );

  return Notification.countDocuments({
    userId,
    isRead: false,
  });
}

async function getNotificationOrFail(
  notificationId: string,
) {
  validateObjectId(
    notificationId,
    "notification ID",
  );

  const notification =
    await Notification.findById(
      notificationId,
    );

  if (!notification) {
    throw new AppError(
      "Notification not found.",
      404,
    );
  }

  return notification;
}

export async function markNotificationAsRead(
  notificationId: string,
  userId: string,
) {
  validateObjectId(
    userId,
    "user ID",
  );

  const notification =
    await getNotificationOrFail(
      notificationId,
    );

  if (
    notification.userId.toString() !==
    userId
  ) {
    throw new AppError(
      "You are not allowed to update this notification.",
      403,
    );
  }

  if (!notification.isRead) {
    notification.isRead =
      true;

    notification.readAt =
      new Date();

    await notification.save();
  }

  return notification;
}

export async function markAllNotificationsAsRead(
  userId: string,
) {
  validateObjectId(
    userId,
    "user ID",
  );

  const result =
    await Notification.updateMany(
      {
        userId,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      },
    );

  return {
    updated:
      result.modifiedCount,
  };
}

export async function deleteNotification(
  notificationId: string,
  userId: string,
) {
  validateObjectId(
    userId,
    "user ID",
  );

  const notification =
    await getNotificationOrFail(
      notificationId,
    );

  if (
    notification.userId.toString() !==
    userId
  ) {
    throw new AppError(
      "You are not allowed to delete this notification.",
      403,
    );
  }

  await notification.deleteOne();

  return {
    deleted: true,
    notificationId,
  };
}