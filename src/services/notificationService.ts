import mongoose from "mongoose";

import {
  Notification,
  type NotificationType,
} from "../models/Notification.js";

import {
  sendEmail,
} from "./emailService.js";

import {
  AppError,
} from "../utils/appError.js";

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

const NOTIFICATION_TYPES: NotificationType[] = [
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
    !NOTIFICATION_TYPES.includes(type)
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

  const link =
    data.link
      ? normalizeText(data.link)
      : undefined;

  return Notification.create({
    userId:
      data.userId,

    type:
      data.type,

    title,

    message,

    link,
  });
}

export async function createNotificationAndEmail(
  data: SendNotificationInput,
) {
  const notification =
    await createNotification(data);

  if (
    data.email &&
    data.email.trim()
  ) {
    const email =
      data.email.trim();

    const subject =
      data.emailSubject?.trim() ||
      data.title.trim();

    try {
      const delivery =
        await sendEmail({
          to: email,
          subject,
          text:
            data.message.trim(),
          html:
            data.emailHtml,
        });

      if (!delivery.accepted) {
        console.error(
          "[Notification] Email was not accepted by the provider.",
          {
            email,
            subject,
            messageId:
              delivery.messageId,
          },
        );
      }
    } catch (error) {
      console.error(
        "[Notification] Email delivery failed:",
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

export async function getNotificationOrFail(
  notificationId: string,
  userId: string,
) {
  validateObjectId(
    notificationId,
    "notification ID",
  );

  validateObjectId(
    userId,
    "user ID",
  );

  const notification =
    await Notification.findOne({
      _id: notificationId,
      userId,
    });

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
  const notification =
    await getNotificationOrFail(
      notificationId,
      userId,
    );

  if (!notification.isRead) {
    notification.isRead = true;
    notification.readAt = new Date();

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

  const now =
    new Date();

  await Notification.updateMany(
    {
      userId,
      isRead: false,
    },
    {
      $set: {
        isRead: true,
        readAt: now,
      },
    },
  );

  return {
    updated: true,
  };
}

export async function deleteNotification(
  notificationId: string,
  userId: string,
) {
  const notification =
    await getNotificationOrFail(
      notificationId,
      userId,
    );

  await notification.deleteOne();

  return {
    deleted: true,
  };
}