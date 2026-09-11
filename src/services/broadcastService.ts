import mongoose from "mongoose";

import { Broadcast } from "../models/Broadcast.js";
import { BroadcastRecipient } from "../models/BroadcastRecipient.js";
import { Client } from "../models/Client.js";
import { Notification } from "../models/Notification.js";
import { User } from "../models/User.js";

import type {
  CreateBroadcastInput,
} from "../utils/broadcastValidation.js";

import { sendEmail } from "./emailService.js";

import { AppError } from "../utils/appError.js";

interface CreateBroadcastParams {
  input: CreateBroadcastInput;
  createdBy: string;
}

interface BroadcastClient {
  clientId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  email: string;
  firstName: string;
  lastName: string;
}

async function resolveRecipients(
  input: CreateBroadcastInput,
): Promise<BroadcastClient[]> {
  if (
    input.recipientType === "selected"
  ) {
    const clientIds = [
      ...new Set(input.clientIds),
    ];

    const clients = await Client.find({
      _id: {
        $in: clientIds,
      },
    })
      .select(
        "_id userId firstName lastName",
      )
      .lean();

    if (
      clients.length !== clientIds.length
    ) {
      throw new AppError(
        "One or more selected clients could not be found.",
        400,
      );
    }

    const userIds = clients.map(
      (client) => client.userId,
    );

    const users = await User.find({
      _id: {
        $in: userIds,
      },
      role: "client",
      isActive: true,
    })
      .select("_id email")
      .lean();

    const usersById = new Map(
      users.map((user) => [
        user._id.toString(),
        user,
      ]),
    );

    return clients.map((client) => {
      const user = usersById.get(
        client.userId.toString(),
      );

      if (!user) {
        throw new AppError(
          `Client ${client.firstName} ${client.lastName} does not have an active client account.`,
          400,
        );
      }

      return {
        clientId: client._id,
        userId: client.userId,
        email: user.email,
        firstName: client.firstName,
        lastName: client.lastName,
      };
    });
  }

  const clients = await Client.find({})
    .select(
      "_id userId firstName lastName",
    )
    .lean();

  if (clients.length === 0) {
    throw new AppError(
      "There are no clients available to receive this broadcast.",
      400,
    );
  }

  const userIds = clients.map(
    (client) => client.userId,
  );

  const users = await User.find({
    _id: {
      $in: userIds,
    },
    role: "client",
    isActive: true,
  })
    .select("_id email")
    .lean();

  const usersById = new Map(
    users.map((user) => [
      user._id.toString(),
      user,
    ]),
  );

  return clients
    .map((client) => {
      const user = usersById.get(
        client.userId.toString(),
      );

      if (!user) {
        return null;
      }

      return {
        clientId: client._id,
        userId: client.userId,
        email: user.email,
        firstName: client.firstName,
        lastName: client.lastName,
      };
    })
    .filter(
      (
        recipient,
      ): recipient is BroadcastClient =>
        recipient !== null,
    );
}

async function createPortalNotifications(
  recipients: BroadcastClient[],
  title: string,
  message: string,
) {
  if (recipients.length === 0) {
    return;
  }

  await Notification.insertMany(
    recipients.map((recipient) => ({
      userId: recipient.userId,
      type: "broadcast" as const,
      title,
      message,
      link: "/client/notifications",
      isRead: false,
    })),
  );
}

async function deliverBroadcastEmails(
  broadcastId: mongoose.Types.ObjectId,
  recipients: BroadcastClient[],
  title: string,
  message: string,
) {
  let emailsSent = 0;
  let emailsFailed = 0;

  for (const recipient of recipients) {
    try {
      const result = await sendEmail({
        to: recipient.email,
        subject: title,
        text: message,
      });

      if (!result.accepted) {
        throw new Error(
          "Email provider did not accept the message.",
        );
      }

      await BroadcastRecipient.updateOne(
        {
          broadcastId,
          clientId: recipient.clientId,
        },
        {
          $set: {
            emailStatus: "sent",
            emailSentAt: new Date(),
            emailError: undefined,
          },
        },
      );

      emailsSent += 1;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown email delivery error.";

      await BroadcastRecipient.updateOne(
        {
          broadcastId,
          clientId: recipient.clientId,
        },
        {
          $set: {
            emailStatus: "failed",
            emailError: errorMessage,
          },
        },
      );

      emailsFailed += 1;
    }
  }

  return {
    emailsSent,
    emailsFailed,
  };
}

export async function createBroadcast({
  input,
  createdBy,
}: CreateBroadcastParams) {
  if (
    !mongoose.isValidObjectId(createdBy)
  ) {
    throw new AppError(
      "Invalid authenticated user.",
      401,
    );
  }

  const recipients =
    await resolveRecipients(input);

  if (recipients.length === 0) {
    throw new AppError(
      "No active clients are available to receive this broadcast.",
      400,
    );
  }

  const broadcast =
    await Broadcast.create({
      title: input.title,
      message: input.message,
      recipientType:
        input.recipientType,
      status: "sending",
      totalRecipients:
        recipients.length,
      emailsSent: 0,
      emailsFailed: 0,
      createdBy,
    });

  try {
    await BroadcastRecipient.insertMany(
      recipients.map((recipient) => ({
        broadcastId: broadcast._id,
        clientId: recipient.clientId,
        userId: recipient.userId,
        email: recipient.email,
        emailStatus: "pending",
      })),
    );

    await createPortalNotifications(
      recipients,
      input.title,
      input.message,
    );

    const delivery =
      await deliverBroadcastEmails(
        broadcast._id,
        recipients,
        input.title,
        input.message,
      );

    const status =
      delivery.emailsFailed === 0
        ? "sent"
        : delivery.emailsSent === 0
          ? "failed"
          : "partially_sent";

    const updatedBroadcast =
      await Broadcast.findByIdAndUpdate(
        broadcast._id,
        {
          $set: {
            status,
            emailsSent:
              delivery.emailsSent,
            emailsFailed:
              delivery.emailsFailed,
            sentAt: new Date(),
          },
        },
        {
          new: true,
        },
      );

    if (!updatedBroadcast) {
      throw new AppError(
        "Broadcast could not be updated after delivery.",
        500,
      );
    }

    return updatedBroadcast;
  } catch (error) {
    await Broadcast.findByIdAndUpdate(
      broadcast._id,
      {
        $set: {
          status: "failed",
        },
      },
    );

    throw error;
  }
}

export async function getBroadcasts() {
  return Broadcast.find({})
    .sort({
      createdAt: -1,
    })
    .lean();
}

export async function getBroadcastById(
  id: string,
) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(
      "Invalid broadcast ID.",
      400,
    );
  }

  const broadcast =
    await Broadcast.findById(id).lean();

  if (!broadcast) {
    throw new AppError(
      "Broadcast not found.",
      404,
    );
  }

  return broadcast;
}

export async function getBroadcastRecipients(
  broadcastId: string,
) {
  if (
    !mongoose.isValidObjectId(
      broadcastId,
    )
  ) {
    throw new AppError(
      "Invalid broadcast ID.",
      400,
    );
  }

  const broadcastExists =
    await Broadcast.exists({
      _id: broadcastId,
    });

  if (!broadcastExists) {
    throw new AppError(
      "Broadcast not found.",
      404,
    );
  }

  return BroadcastRecipient.find({
    broadcastId,
  })
    .sort({
      createdAt: 1,
    })
    .lean();
}