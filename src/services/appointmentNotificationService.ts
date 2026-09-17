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

type AppointmentRecipient =
  | "client"
  | "admin";

type AppointmentNotificationData = {
  appointmentId: string;
  event: AppointmentNotificationEvent;
  reason?: string;
  recipient?: AppointmentRecipient;
};

type AppointmentDetails = {
  appointmentId: string;
  clientUserId: string;
  clientEmail: string;
  clientFirstName: string;
  clientLastName: string;
  serviceName: string;
  date: string;
  startTime: string;
  endTime: string;
  sessionType: string;
  meetingLink?: string;
  location?: string;
  adminNote?: string;
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

function formatTime(date: Date) {
  return new Intl.DateTimeFormat(
    "en-NG",
    {
      timeZone: "Africa/Lagos",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    },
  ).format(date);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat(
    "en-NG",
    {
      timeZone: "Africa/Lagos",
      dateStyle: "long",
    },
  ).format(new Date(date));
}

function formatSessionType(
  sessionType: string,
) {
  switch (sessionType) {
    case "in_person":
      return "In-person";

    case "online":
      return "Online";

    case "phone":
      return "Phone";

    default:
      return sessionType;
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getClientFullName(
  appointment: AppointmentDetails,
) {
  return `${appointment.clientFirstName} ${appointment.clientLastName}`.trim();
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

  if (!service?.name) {
    throw new AppError(
      "Appointment service information is unavailable.",
      500,
    );
  }

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
      "Appointment schedule information is unavailable.",
      500,
    );
  }

  return {
    appointmentId:
      appointment._id.toString(),

    clientUserId:
      client.userId.toString(),

    clientEmail: user.email,

    clientFirstName:
      client.firstName,

    clientLastName:
      client.lastName,

    serviceName:
      service.name,

    date:
      appointmentStart.toISOString(),

    startTime:
      formatTime(appointmentStart),

    endTime:
      formatTime(appointmentEnd),

    sessionType:
      formatSessionType(
        appointment.sessionType,
      ),

    meetingLink:
      appointment.meetingLink,

    location:
      appointment.location,

    adminNote:
      appointment.adminNote,
  };
}

function getClientEventContent(
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

function getAdminEventContent(
  event: AppointmentNotificationEvent,
  data: AppointmentDetails,
  reason?: string,
) {
  const clientName =
    getClientFullName(data);

  const date =
    formatDate(data.date);

  switch (event) {
    case "created":
      return {
        title:
          "New appointment request",

        message:
          `${clientName} has submitted a ${data.serviceName} appointment request for ${date} at ${data.startTime}.`,

        subject:
          `New appointment request - ${data.serviceName}`,
      };

    case "cancelled":
      return {
        title:
          "Appointment cancelled by client",

        message:
          reason
            ? `${clientName} has cancelled their ${data.serviceName} appointment scheduled for ${date} at ${data.startTime}. Reason: ${reason}`
            : `${clientName} has cancelled their ${data.serviceName} appointment scheduled for ${date} at ${data.startTime}.`,

        subject:
          `Appointment cancelled by client - ${data.serviceName}`,
      };

    default:
      return {
        title:
          "Appointment update",

        message:
          `${clientName}'s ${data.serviceName} appointment has been updated.`,

        subject:
          `Appointment update - ${data.serviceName}`,
      };
  }
}

function getPortalLink(
  recipient: AppointmentRecipient,
  appointmentId: string,
) {
  const baseUrl =
    process.env.CLIENT_URL?.trim() ||
    "http://localhost:5173";

  if (recipient === "admin") {
    return `${baseUrl}/admin/appointments/${appointmentId}`;
  }

  return `${baseUrl}/portal/appointments/${appointmentId}`;
}

function getAppointmentDetailsHtml(
  data: AppointmentDetails,
) {
  const rows = [
    `
      <tr>
        <td style="padding:8px 0;color:#6b7280;">Service</td>
        <td style="padding:8px 0;font-weight:600;">
          ${escapeHtml(data.serviceName)}
        </td>
      </tr>
    `,
    `
      <tr>
        <td style="padding:8px 0;color:#6b7280;">Date</td>
        <td style="padding:8px 0;font-weight:600;">
          ${escapeHtml(formatDate(data.date))}
        </td>
      </tr>
    `,
    `
      <tr>
        <td style="padding:8px 0;color:#6b7280;">Time</td>
        <td style="padding:8px 0;font-weight:600;">
          ${escapeHtml(data.startTime)} - ${escapeHtml(data.endTime)}
        </td>
      </tr>
    `,
    `
      <tr>
        <td style="padding:8px 0;color:#6b7280;">Session type</td>
        <td style="padding:8px 0;font-weight:600;">
          ${escapeHtml(data.sessionType)}
        </td>
      </tr>
    `,
  ];

  if (data.location) {
    rows.push(`
      <tr>
        <td style="padding:8px 0;color:#6b7280;">Location</td>
        <td style="padding:8px 0;font-weight:600;">
          ${escapeHtml(data.location)}
        </td>
      </tr>
    `);
  }

  if (data.meetingLink) {
    rows.push(`
      <tr>
        <td style="padding:8px 0;color:#6b7280;">Meeting link</td>
        <td style="padding:8px 0;font-weight:600;">
          <a
            href="${escapeHtml(data.meetingLink)}"
            style="color:#2f6b4f;text-decoration:none;"
          >
            Join online session
          </a>
        </td>
      </tr>
    `);
  }

  if (data.adminNote) {
    rows.push(`
      <tr>
        <td style="padding:8px 0;color:#6b7280;">Note</td>
        <td style="padding:8px 0;">
          ${escapeHtml(data.adminNote)}
        </td>
      </tr>
    `);
  }

  return `
    <table
      role="presentation"
      width="100%"
      cellspacing="0"
      cellpadding="0"
      style="
        border-collapse:collapse;
        margin:24px 0;
        font-size:15px;
      "
    >
      ${rows.join("")}
    </table>
  `;
}

function getClientEmailHtml(
  data: AppointmentDetails,
  title: string,
  message: string,
  link: string,
) {
  const safeTitle =
    escapeHtml(title);

  const safeMessage =
    escapeHtml(message);

  return `
    <!DOCTYPE html>
    <html>
      <body
        style="
          margin:0;
          padding:0;
          background:#f7f7f4;
          font-family:Arial,Helvetica,sans-serif;
          color:#1f2933;
        "
      >
        <div style="padding:40px 20px;">
          <div
            style="
              max-width:600px;
              margin:0 auto;
              background:#ffffff;
              border-radius:12px;
              padding:40px;
              border:1px solid #e5e7eb;
            "
          >
            <div
              style="
                margin-bottom:28px;
                color:#2f6b4f;
                font-size:20px;
                font-weight:700;
              "
            >
              Stitches-N-Spice
            </div>

            <h1
              style="
                margin:0 0 16px;
                font-size:26px;
                line-height:1.3;
                color:#1f2933;
              "
            >
              ${safeTitle}
            </h1>

            <p
              style="
                margin:0;
                font-size:16px;
                line-height:1.7;
              "
            >
              ${safeMessage}
            </p>

            ${getAppointmentDetailsHtml(data)}

            <a
              href="${escapeHtml(link)}"
              style="
                display:inline-block;
                padding:13px 22px;
                background:#2f6b4f;
                color:#ffffff;
                text-decoration:none;
                border-radius:7px;
                font-size:15px;
                font-weight:600;
              "
            >
              View appointment
            </a>

            <p
              style="
                margin:30px 0 0;
                color:#6b7280;
                font-size:14px;
                line-height:1.6;
              "
            >
              If you have any questions, please contact
              Stitches-N-Spice.
            </p>

            <p
              style="
                margin:20px 0 0;
                font-size:14px;
                line-height:1.6;
              "
            >
              Regards,<br />
              Stitches-N-Spice
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function getAdminEmailHtml(
  data: AppointmentDetails,
  title: string,
  message: string,
  link: string,
) {
  const safeTitle =
    escapeHtml(title);

  const safeMessage =
    escapeHtml(message);

  const clientName =
    escapeHtml(
      getClientFullName(data),
    );

  return `
    <!DOCTYPE html>
    <html>
      <body
        style="
          margin:0;
          padding:0;
          background:#f7f7f4;
          font-family:Arial,Helvetica,sans-serif;
          color:#1f2933;
        "
      >
        <div style="padding:40px 20px;">
          <div
            style="
              max-width:600px;
              margin:0 auto;
              background:#ffffff;
              border-radius:12px;
              padding:40px;
              border:1px solid #e5e7eb;
            "
          >
            <div
              style="
                margin-bottom:28px;
                color:#2f6b4f;
                font-size:20px;
                font-weight:700;
              "
            >
              Stitches-N-Spice
            </div>

            <h1
              style="
                margin:0 0 16px;
                font-size:26px;
                line-height:1.3;
                color:#1f2933;
              "
            >
              ${safeTitle}
            </h1>

            <p
              style="
                margin:0 0 20px;
                font-size:16px;
                line-height:1.7;
              "
            >
              ${safeMessage}
            </p>

            <div
              style="
                padding:18px;
                background:#f7f7f4;
                border-radius:8px;
                margin-bottom:20px;
              "
            >
              <div
                style="
                  color:#6b7280;
                  font-size:13px;
                  margin-bottom:5px;
                "
              >
                Client
              </div>

              <div
                style="
                  font-size:17px;
                  font-weight:600;
                "
              >
                ${clientName}
              </div>
            </div>

            ${getAppointmentDetailsHtml(data)}

            <a
              href="${escapeHtml(link)}"
              style="
                display:inline-block;
                padding:13px 22px;
                background:#2f6b4f;
                color:#ffffff;
                text-decoration:none;
                border-radius:7px;
                font-size:15px;
                font-weight:600;
              "
            >
              View appointment
            </a>

            <p
              style="
                margin:30px 0 0;
                color:#6b7280;
                font-size:14px;
                line-height:1.6;
              "
            >
              Stitches-N-Spice appointment management
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

async function notifyClient(
  data: AppointmentDetails,
  event: AppointmentNotificationEvent,
  reason?: string,
) {
  const content =
    getClientEventContent(
      event,
      data,
      reason,
    );

  const link =
    getPortalLink(
      "client",
      data.appointmentId,
    );

  return createNotificationAndEmail({
    userId:
      data.clientUserId,

    type:
      "appointment",

    title:
      content.title,

    message:
      content.message,

    link,

    email:
      data.clientEmail,

    emailSubject:
      content.subject,

    emailHtml:
      getClientEmailHtml(
        data,
        content.title,
        content.message,
        link,
      ),
  });
}

async function getActiveAdmins() {
  return User.find({
    role: "admin",
    isActive: true,
  }).select(
    "_id email",
  );
}

async function notifyAdmins(
  data: AppointmentDetails,
  event: AppointmentNotificationEvent,
  reason?: string,
) {
  const admins =
    await getActiveAdmins();

  if (!admins.length) {
    console.warn(
      `[AppointmentNotification] No active administrators found for appointment ${data.appointmentId}.`,
    );

    return [];
  }

  const content =
    getAdminEventContent(
      event,
      data,
      reason,
    );

  const link =
    getPortalLink(
      "admin",
      data.appointmentId,
    );

  const results =
    await Promise.allSettled(
      admins.map((admin) =>
        createNotificationAndEmail({
          userId:
            admin._id.toString(),

          type:
            "appointment",

          title:
            content.title,

          message:
            content.message,

          link,

          email:
            admin.email,

          emailSubject:
            content.subject,

          emailHtml:
            getAdminEmailHtml(
              data,
              content.title,
              content.message,
              link,
            ),
        }),
      ),
    );

    results.forEach(
    (result, index) => {
      if (result.status === "rejected") {
        const admin =
          admins[index];

        console.error(
          `[AppointmentNotification] Failed to notify admin ${admin?._id.toString() ?? "unknown"}:`,
          result.reason,
        );
      }
    },
  );

  return results;
}

export async function notifyAppointmentEvent(
  data: AppointmentNotificationData,
) {
  const appointment =
    await getAppointmentDetails(
      data.appointmentId,
    );

  const recipient =
    data.recipient ??
    "client";

  try {
    if (recipient === "admin") {
      return await notifyAdmins(
        appointment,
        data.event,
        data.reason,
      );
    }

    return await notifyClient(
      appointment,
      data.event,
      data.reason,
    );
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
  const appointment =
    await getAppointmentDetails(
      appointmentId,
    );

  try {
    await notifyClient(
      appointment,
      "created",
    );

    await notifyAdmins(
      appointment,
      "created",
    );
  } catch (error) {
    console.error(
      `Failed to notify appointment creation for ${appointmentId}:`,
      error,
    );
  }
}

export async function notifyAppointmentAccepted(
  appointmentId: string,
) {
  return notifyAppointmentEvent({
    appointmentId,
    event: "accepted",
    recipient: "client",
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
    recipient: "client",
  });
}

export async function notifyAppointmentCancelled(
  appointmentId: string,
  reason?: string,
  recipient: AppointmentRecipient = "client",
) {
  return notifyAppointmentEvent({
    appointmentId,
    event: "cancelled",
    reason,
    recipient,
  });
}

export async function notifyAppointmentRescheduled(
  appointmentId: string,
) {
  return notifyAppointmentEvent({
    appointmentId,
    event: "rescheduled",
    recipient: "client",
  });
}

export async function notifyAppointmentCompleted(
  appointmentId: string,
) {
  return notifyAppointmentEvent({
    appointmentId,
    event: "completed",
    recipient: "client",
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
    default:
      return null;
  }
}