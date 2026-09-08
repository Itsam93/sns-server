import type { Request, Response } from "express";

import {
  deleteNotification,
  getUnreadNotificationCount,
  getUnreadNotifications,
  getUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../services/notificationService.js";

function getUserId(
  req: Request,
) {
  const userId =
    req.user?.userId;

  if (
    !userId ||
    !userId.trim()
  ) {
    throw new Error(
      "Authenticated user is required.",
    );
  }

  return userId;
}

function getNotificationId(
  req: Request,
) {
  const { id } =
    req.params;

  if (
    typeof id !== "string" ||
    !id.trim()
  ) {
    throw new Error(
      "Notification ID is required.",
    );
  }

  return id;
}

export async function getAll(
  req: Request,
  res: Response,
) {
  const notifications =
    await getUserNotifications(
      getUserId(req),
    );

  res.status(200).json({
    success: true,
    data: notifications,
  });
}

export async function getUnread(
  req: Request,
  res: Response,
) {
  const notifications =
    await getUnreadNotifications(
      getUserId(req),
    );

  res.status(200).json({
    success: true,
    data: notifications,
  });
}

export async function getUnreadCount(
  req: Request,
  res: Response,
) {
  const count =
    await getUnreadNotificationCount(
      getUserId(req),
    );

  res.status(200).json({
    success: true,
    data: {
      count,
    },
  });
}

export async function markAsRead(
  req: Request,
  res: Response,
) {
  const notification =
    await markNotificationAsRead(
      getNotificationId(req),
      getUserId(req),
    );

  res.status(200).json({
    success: true,
    message:
      "Notification marked as read.",
    data: notification,
  });
}

export async function markAllAsRead(
  req: Request,
  res: Response,
) {
  const result =
    await markAllNotificationsAsRead(
      getUserId(req),
    );

  res.status(200).json({
    success: true,
    message:
      "All notifications marked as read.",
    data: result,
  });
}

export async function remove(
  req: Request,
  res: Response,
) {
  const result =
    await deleteNotification(
      getNotificationId(req),
      getUserId(req),
    );

  res.status(200).json({
    success: true,
    message:
      "Notification deleted successfully.",
    data: result,
  });
}