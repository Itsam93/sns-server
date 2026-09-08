import mongoose from "mongoose";

import {
  ContactMessage,
  type ContactMessageCategory,
  type ContactMessageStatus,
} from "../models/ContactMessage.js";
import { AppError } from "../utils/appError.js";

type CreateContactMessageInput = {
  fullName: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  category?: ContactMessageCategory;
};

type UpdateContactMessageInput = {
  adminNote?: string;
};

const CONTACT_MESSAGE_STATUSES: ContactMessageStatus[] = [
  "new",
  "read",
  "responded",
  "archived",
];

const CONTACT_MESSAGE_CATEGORIES: ContactMessageCategory[] = [
  "general",
  "appointment",
  "counselling",
  "workshop",
  "partnership",
  "other",
];

const STATUS_TRANSITIONS: Record<
  ContactMessageStatus,
  ContactMessageStatus[]
> = {
  new: [
    "read",
    "responded",
    "archived",
  ],

  read: [
    "responded",
    "archived",
    "new",
  ],

  responded: [
    "archived",
    "read",
  ],

  archived: [
    "read",
    "responded",
    "new",
  ],
};

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

async function getContactMessageOrFail(
  contactMessageId: string,
) {
  validateObjectId(
    contactMessageId,
    "contact message ID",
  );

  const contactMessage =
    await ContactMessage.findById(
      contactMessageId,
    );

  if (!contactMessage) {
    throw new AppError(
      "Contact message not found.",
      404,
    );
  }

  return contactMessage;
}

function validateStatus(
  status: ContactMessageStatus,
) {
  if (
    !CONTACT_MESSAGE_STATUSES.includes(
      status,
    )
  ) {
    throw new AppError(
      "Invalid contact message status.",
      400,
    );
  }
}

function validateCategory(
  category: ContactMessageCategory,
) {
  if (
    !CONTACT_MESSAGE_CATEGORIES.includes(
      category,
    )
  ) {
    throw new AppError(
      "Invalid contact message category.",
      400,
    );
  }
}

export async function createContactMessage(
  data: CreateContactMessageInput,
) {
  const category =
    data.category ?? "general";

  validateCategory(category);

  return ContactMessage.create({
    fullName:
      data.fullName,

    email:
      data.email,

    phone:
      data.phone,

    subject:
      data.subject,

    message:
      data.message,

    category,

    status: "new",
  });
}

export async function getAllContactMessages() {
  return ContactMessage.find().sort({
    createdAt: -1,
  });
}

export async function getContactMessageById(
  contactMessageId: string,
) {
  return getContactMessageOrFail(
    contactMessageId,
  );
}

export async function getContactMessagesByStatus(
  status: ContactMessageStatus,
) {
  validateStatus(status);

  return ContactMessage.find({
    status,
  }).sort({
    createdAt: -1,
  });
}

export async function getContactMessagesByCategory(
  category: ContactMessageCategory,
) {
  validateCategory(category);

  return ContactMessage.find({
    category,
  }).sort({
    createdAt: -1,
  });
}

export async function getUnreadContactMessageCount() {
  return ContactMessage.countDocuments({
    status: "new",
  });
}

export async function updateContactMessage(
  contactMessageId: string,
  data: UpdateContactMessageInput,
) {
  const contactMessage =
    await getContactMessageOrFail(
      contactMessageId,
    );

  if (
    data.adminNote !==
    undefined
  ) {
    contactMessage.adminNote =
      data.adminNote;
  }

  await contactMessage.save();

  return contactMessage;
}

export async function updateContactMessageStatus(
  contactMessageId: string,
  status: ContactMessageStatus,
  adminNote?: string,
) {
  validateStatus(status);

  const contactMessage =
    await getContactMessageOrFail(
      contactMessageId,
    );

  const currentStatus =
    contactMessage.status;

  if (
    currentStatus !==
    status
  ) {
    const allowedTransitions =
      STATUS_TRANSITIONS[
        currentStatus
      ];

    if (
      !allowedTransitions.includes(
        status,
      )
    ) {
      throw new AppError(
        `A contact message cannot move from "${currentStatus}" to "${status}".`,
        400,
      );
    }
  }

  contactMessage.status =
    status;

  if (
    adminNote !==
    undefined
  ) {
    contactMessage.adminNote =
      adminNote;
  }

  if (
    status === "responded"
  ) {
    contactMessage.respondedAt =
      contactMessage.respondedAt ??
      new Date();
  }

  if (
    status !== "responded"
  ) {
    contactMessage.respondedAt =
      undefined;
  }

  await contactMessage.save();

  return contactMessage;
}

export async function deleteContactMessage(
  contactMessageId: string,
) {
  const contactMessage =
    await getContactMessageOrFail(
      contactMessageId,
    );

  await contactMessage.deleteOne();

  return {
    deleted: true,
    contactMessageId,
  };
}