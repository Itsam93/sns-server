import mongoose from "mongoose";

import {
  ContactMessage,
  type ContactMessageCategory,
  type ContactMessageStatus,
} from "../models/ContactMessage.js";
import { User } from "../models/User.js";
import { createNotification } from "./notificationService.js";
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

function normalizeText(value: string) {
  return value.trim();
}

async function notifyAdminsOfNewContactMessage(
  contactMessage: {
    _id: mongoose.Types.ObjectId;
    fullName: string;
    subject: string;
    category: ContactMessageCategory;
  },
) {
  const admins = await User.find({
    role: "admin",
    isActive: true,
  }).select("_id");

  if (!admins.length) {
    return;
  }

  const categoryLabel =
    contactMessage.category.charAt(0).toUpperCase() +
    contactMessage.category.slice(1);

  const title = "New contact message";

  const message =
    `${contactMessage.fullName} sent a new ${categoryLabel.toLowerCase()} enquiry: "${contactMessage.subject}".`;

  const link =
    `/admin/contact-messages/${contactMessage._id.toString()}`;

  await Promise.all(
    admins.map((admin) =>
      createNotification({
        userId: admin._id.toString(),
        type: "system",
        title,
        message,
        link,
      }),
    ),
  );
}

export async function createContactMessage(
  data: CreateContactMessageInput,
) {
  const fullName = normalizeText(
    data.fullName,
  );
  const email = normalizeText(
    data.email,
  ).toLowerCase();
  const phone = data.phone
    ? normalizeText(data.phone)
    : undefined;
  const subject = normalizeText(
    data.subject,
  );
  const message = normalizeText(
    data.message,
  );
  const category =
    data.category ?? "general";

  if (!fullName) {
    throw new AppError(
      "Full name is required.",
      400,
    );
  }

  if (!email) {
    throw new AppError(
      "Email is required.",
      400,
    );
  }

  if (!subject) {
    throw new AppError(
      "Subject is required.",
      400,
    );
  }

  if (!message) {
    throw new AppError(
      "Message is required.",
      400,
    );
  }

  validateCategory(category);

  const contactMessage =
    await ContactMessage.create({
      fullName,
      email,
      phone,
      subject,
      message,
      category,
      status: "new",
    });

  try {
    await notifyAdminsOfNewContactMessage(
      contactMessage,
    );
  } catch (error) {
    console.error(
      "[ContactMessage] Failed to create admin notification:",
      error,
    );
  }

  return contactMessage;
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
    data.adminNote !== undefined
  ) {
    contactMessage.adminNote =
      normalizeText(data.adminNote);
  }

  await contactMessage.save();

  return contactMessage;
}

export async function updateContactMessageStatus(
  contactMessageId: string,
  status: ContactMessageStatus,
) {
  validateStatus(status);

  const contactMessage =
    await getContactMessageOrFail(
      contactMessageId,
    );

  if (
    contactMessage.status !== status &&
    !STATUS_TRANSITIONS[
      contactMessage.status
    ].includes(status)
  ) {
    throw new AppError(
      `Cannot change contact message status from "${contactMessage.status}" to "${status}".`,
      400,
    );
  }

  contactMessage.status = status;

  if (status === "responded") {
    contactMessage.respondedAt =
      new Date();
  } else if (
    contactMessage.status !==
    "responded"
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
  };
}
