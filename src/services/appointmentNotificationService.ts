import mongoose from "mongoose";

import {
  Appointment,
  type AppointmentStatus,
} from "../models/Appointment.js";
import { Client } from "../models/Client.js";
import { User } from "../models/User.js";
import { AppError } from "../utils/appError.js";
import {
  createNotificationAndEmail,
} from "./notificationService.js";

type AppointmentNotificationEvent =
  | "created"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "rescheduled"
  | "completed";

type AppointmentNotificationData = {
  appointmentId: string;
  event: AppointmentNotificationEvent;
  reason?: string;
};

type AppointmentDetails = {
  appointmentId: string;
  userId: string;
  email: string;
  serviceName: string;
  date: string;
  startTime: string;
  endTime: string;
  sessionType: string;
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

function formatTime(
  date: Date,
) {
  return date.toLocaleTimeString(
    "en-NG",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
  );
}

async function getAppointmentDetails(
  appointmentId: string,
): Promise<AppointmentDetails> {
  validateObjectId(
    appointmentId,
    "appointment ID",
  );

  const appointment =
    await Appointment.findById(
      appointmentId,
    ).populate(
      "serviceId",
      "name",
    );

  if (!appointment) {
    throw new AppError(
      "Appointment not found.",
      404,
    );
  }

  const client =
    await Client.findById(
      appointment.clientId,
    );

  if (!client) {
    throw new AppError(
      "Client profile not found.",
      404,
    );
  }

  const user =
    await User.findById(
      client.userId,
    ).select(
      "email",
    );

  if (!user) {
    throw new AppError(
      "Client account not found.",
      404,
    );
  }

  const service =
    appointment.serviceId as unknown as {
      name: string;
    };

  const appointmentStart =
    appointment.scheduledStart ??
    appointment.requestedStart;

  const appointmentEnd =
    appointment.scheduledEnd ??
    appointment.requestedEnd;

  if (
    !appointmentStart ||
    !appointmentEnd
  ) {
    throw new AppError(
      "Appointment schedule is incomplete.",
      500,
    );
  }

  return {
    appointmentId:
      appointment._id.toString(),

    userId:
      client.userId.toString(),

    email:
      user.email,

    serviceName:
      service.name,

    date:
      appointmentStart.toISOString(),

    startTime:
      formatTime(
        appointmentStart,
      ),

    endTime:
      formatTime(
        appointmentEnd,
      ),

    sessionType:
      appointment.sessionType,
  };
}

function formatDate(
  date: string,
) {
  return new Intl.DateTimeFormat(
    "en-NG",
    {
      dateStyle: "long",
    },
  ).format(
    new Date(date),
  );
}

function getEventContent(
  event: AppointmentNotificationEvent,
  data: AppointmentDetails,
  reason?: string,
) {
  const date =
    formatDate(data.date);

  switch (event) {
    case "created":
      return {
        title:
          "Appointment request received",

        message:
          `Your ${data.serviceName} appointment request for ${date} at ${data.startTime} has been received and is awaiting confirmation.`,

        subject:
          "Appointment request received",
      };

    case "accepted":
      return {
        title:
          "Appointment confirmed",

        message:
          `Your ${data.serviceName} appointment on ${date} at ${data.startTime} has been confirmed.`,

        subject:
          "Your appointment has been confirmed",
      };

    case "rejected":
      return {
        title:
          "Appointment request declined",

        message:
          reason
            ? `Your ${data.serviceName} appointment request for ${date} could not be accepted. Reason: ${reason}`
            : `Your ${data.serviceName} appointment request for ${date} could not be accepted.`,

        subject:
          "Appointment request declined",
      };

    case "cancelled":
      return {
        title:
          "Appointment cancelled",

        message:
          reason
            ? `Your ${data.serviceName} appointment on ${date} at ${data.startTime} has been cancelled. Reason: ${reason}`
            : `Your ${data.serviceName} appointment on ${date} at ${data.startTime} has been cancelled.`,

        subject:
          "Your appointment has been cancelled",
      };

    case "rescheduled":
      return {
        title:
          "Appointment rescheduled",

        message:
          `Your ${data.serviceName} appointment has been rescheduled to ${date} at ${data.startTime}.`,

        subject:
          "Your appointment has been rescheduled",
      };

    case "completed":
      return {
        title:
          "Appointment completed",

        message:
          `Your ${data.serviceName} appointment on ${date} has been marked as completed.`,

        subject:
          "Appointment completed",
      };
  }
}

function getEmailHtml(
  event: AppointmentNotificationEvent,
  data: AppointmentDetails,
  reason?: string,
) {
  const content =
    getEventContent(
      event,
      data,
      reason,
    );

  const date =
    formatDate(data.date);

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1C2420;">
      <h2>${content.title}</h2>

      <p>${content.message}</p>

      <p>
        <strong>Service:</strong>
        ${data.serviceName}
      </p>

      <p>
        <strong>Date:</strong>
        ${date}
      </p>

      <p>
        <strong>Time:</strong>
        ${data.startTime} - ${data.endTime}
      </p>

      <p>
        <strong>Session type:</strong>
        ${data.sessionType}
      </p>

      <p>
        Please sign in to your client portal for the full appointment details.
      </p>

      <p>
        Regards,<br />
        SnS
      </p>
    </div>
  `;
}

export async function notifyAppointmentEvent(
  data: AppointmentNotificationData,
) {
  const appointment =
    await getAppointmentDetails(
      data.appointmentId,
    );

  const content =
    getEventContent(
      data.event,
      appointment,
      data.reason,
    );

  try {
    return await createNotificationAndEmail({
      userId:
        appointment.userId,

      type:
        "appointment",

      title:
        content.title,

      message:
        content.message,

      link:
        `/portal/appointments/${appointment.appointmentId}`,

      email:
        appointment.email,

      emailSubject:
        content.subject,

      emailHtml:
        getEmailHtml(
          data.event,
          appointment,
          data.reason,
        ),
    });
  } catch (error) {
    console.error(
      `Failed to create appointment notification for ${appointment.appointmentId}:`,
      error,
    );

    return null;
  }
}

export async function notifyAppointmentCreated(
  appointmentId: string,
) {
  return notifyAppointmentEvent({
    appointmentId,
    event: "created",
  });
}

export async function notifyAppointmentAccepted(
  appointmentId: string,
) {
  return notifyAppointmentEvent({
    appointmentId,
    event: "accepted",
  });
}

export async function notifyAppointmentRejected(
  appointmentId: string,
  reason?: string,
) {
  return notifyAppointmentEvent({
    appointmentId,
    event: "rejected",
    reason,
  });
}

export async function notifyAppointmentCancelled(
  appointmentId: string,
  reason?: string,
) {
  return notifyAppointmentEvent({
    appointmentId,
    event: "cancelled",
    reason,
  });
}

export async function notifyAppointmentRescheduled(
  appointmentId: string,
) {
  return notifyAppointmentEvent({
    appointmentId,
    event: "rescheduled",
  });
}

export async function notifyAppointmentCompleted(
  appointmentId: string,
) {
  return notifyAppointmentEvent({
    appointmentId,
    event: "completed",
  });
}

export function getAppointmentNotificationEvent(
  status: AppointmentStatus,
): AppointmentNotificationEvent | null {
  switch (status) {
    case "pending":
      return "created";

    case "accepted":
      return "accepted";

    case "rejected":
      return "rejected";

    case "cancelled":
      return "cancelled";

    case "rescheduled":
      return "rescheduled";

    case "completed":
      return "completed";

    case "ongoing":
      return null;

    default:
      return null;
  }
}