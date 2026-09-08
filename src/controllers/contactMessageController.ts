import type { Request, Response } from "express";

import {
  createContactMessage,
  deleteContactMessage,
  getAllContactMessages,
  getContactMessageById,
  getContactMessagesByCategory,
  getContactMessagesByStatus,
  getUnreadContactMessageCount,
  updateContactMessage,
  updateContactMessageStatus,
} from "../services/contactMessageService.js";

import type {
  ContactMessageCategory,
  ContactMessageStatus,
} from "../models/ContactMessage.js";

type ContactMessageIdParams = {
  id: string;
};

type ContactMessageStatusParams = {
  status: ContactMessageStatus;
};

type ContactMessageCategoryParams = {
  category: ContactMessageCategory;
};

export async function create(
  req: Request,
  res: Response,
) {
  const contactMessage =
    await createContactMessage(req.body);

  res.status(201).json({
    success: true,
    message:
      "Your message has been sent successfully.",
    data: contactMessage,
  });
}

export async function getAll(
  _req: Request,
  res: Response,
) {
  const contactMessages =
    await getAllContactMessages();

  res.status(200).json({
    success: true,
    data: contactMessages,
  });
}

export async function getOne(
  req: Request<ContactMessageIdParams>,
  res: Response,
) {
  const contactMessage =
    await getContactMessageById(
      req.params.id,
    );

  res.status(200).json({
    success: true,
    data: contactMessage,
  });
}

export async function getByStatus(
  req: Request<ContactMessageStatusParams>,
  res: Response,
) {
  const contactMessages =
    await getContactMessagesByStatus(
      req.params.status,
    );

  res.status(200).json({
    success: true,
    data: contactMessages,
  });
}

export async function getByCategory(
  req: Request<ContactMessageCategoryParams>,
  res: Response,
) {
  const contactMessages =
    await getContactMessagesByCategory(
      req.params.category,
    );

  res.status(200).json({
    success: true,
    data: contactMessages,
  });
}

export async function getUnreadCount(
  _req: Request,
  res: Response,
) {
  const count =
    await getUnreadContactMessageCount();

  res.status(200).json({
    success: true,
    data: {
      count,
    },
  });
}

export async function update(
  req: Request<ContactMessageIdParams>,
  res: Response,
) {
  const contactMessage =
    await updateContactMessage(
      req.params.id,
      req.body,
    );

  res.status(200).json({
    success: true,
    message:
      "Contact message updated successfully.",
    data: contactMessage,
  });
}

export async function updateStatus(
  req: Request<ContactMessageIdParams>,
  res: Response,
) {
  const contactMessage =
    await updateContactMessageStatus(
      req.params.id,
      req.body.status,
      req.body.adminNote,
    );

  res.status(200).json({
    success: true,
    message:
      "Contact message status updated successfully.",
    data: contactMessage,
  });
}

export async function remove(
  req: Request<ContactMessageIdParams>,
  res: Response,
) {
  const result =
    await deleteContactMessage(
      req.params.id,
    );

  res.status(200).json({
    success: true,
    message:
      "Contact message deleted successfully.",
    data: result,
  });
}