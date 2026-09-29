import type {
  Request,
  Response,
} from "express";

import {
  acceptAppointment,
  canClientBook,
  cancelAppointment,
  cancelClientAppointment,
  completeAppointment,
  createAppointment,
  getAllAppointments,
  getAppointmentById,
  getClientAppointmentById,
  getClientAppointments,
  rejectAppointment,
  rescheduleAppointment,
  startAppointment,
} from "../services/appointmentService.js";
import {
  acceptAppointmentSchema,
  cancelAppointmentSchema,
  createAppointmentSchema,
  rejectAppointmentSchema,
  rescheduleAppointmentSchema,
} from "../utils/appointmentValidation.js";
import { AppError } from "../utils/appError.js";

function getAuthenticatedUser(
  req: Request,
) {
  const user = req.user;

  if (!user) {
    throw new AppError(
      "Authentication required.",
      401,
    );
  }

  return user;
}

function getClientId(
  req: Request,
): string {
  const clientId = req.user?.clientId;

  if (
    typeof clientId !== "string" ||
    !clientId.trim()
  ) {
    throw new AppError(
      "Client profile not found.",
      404,
    );
  }

  return clientId.trim();
}

function getAppointmentId(
  req: Request,
): string {
  const id = req.params.id;

  if (
    typeof id !== "string" ||
    !id.trim()
  ) {
    throw new AppError(
      "Appointment ID is required.",
      400,
    );
  }

  return id.trim();
}

function getRequiredServicePackageId(
  req: Request,
): string {
  const servicePackageId =
    req.body?.servicePackageId;

  if (
    typeof servicePackageId !== "string" ||
    !servicePackageId.trim()
  ) {
    throw new AppError(
      "Service package ID is required.",
      400,
    );
  }

  const value =
    servicePackageId.trim();

  if (
    !/^[a-f\d]{24}$/i.test(value)
  ) {
    throw new AppError(
      "Invalid service package ID.",
      400,
    );
  }

  return value;
}

function getCreateInput(
  req: Request,
) {
  const body = req.body ?? {};

  const result =
    createAppointmentSchema
      .pick({
        serviceId: true,
        requestedDate: true,
        requestedTime: true,
        sessionType: true,
      })
      .safeParse({
        serviceId:
          body.serviceId,
        requestedDate:
          body.requestedDate,
        requestedTime:
          body.requestedTime,
        sessionType:
          body.sessionType,
      });

  if (!result.success) {
    throw new AppError(
      result.error.issues[0]?.message ??
        "Invalid appointment details.",
      400,
    );
  }

  return {
    clientId:
      getClientId(req),

    serviceId:
      result.data.serviceId,

    servicePackageId:
      getRequiredServicePackageId(req),

    requestedDate:
      result.data.requestedDate,

    requestedTime:
      result.data.requestedTime,

    sessionType:
      result.data.sessionType,
  };
}

function getAcceptInput(
  req: Request,
) {
  const result =
    acceptAppointmentSchema.safeParse(
      req.body ?? {},
    );

  if (!result.success) {
    throw new AppError(
      result.error.issues[0]?.message ??
        "Invalid appointment acceptance details.",
      400,
    );
  }

  return {
    appointmentId:
      getAppointmentId(req),

    scheduledDate:
      result.data.scheduledDate,

    scheduledTime:
      result.data.scheduledTime,

    adminNote:
      result.data.adminNote,

    meetingLink:
      result.data.meetingLink,

    location:
      result.data.location,
  };
}

function getRescheduleInput(
  req: Request,
) {
  const result =
    rescheduleAppointmentSchema.safeParse(
      req.body ?? {},
    );

  if (!result.success) {
    throw new AppError(
      result.error.issues[0]?.message ??
        "Invalid rescheduling details.",
      400,
    );
  }

  return {
    appointmentId:
      getAppointmentId(req),

    requestedDate:
      result.data.requestedDate,

    requestedTime:
      result.data.requestedTime,
  };
}

function getRejectReason(
  req: Request,
): string {
  const result =
    rejectAppointmentSchema.safeParse(
      req.body ?? {},
    );

  if (!result.success) {
    throw new AppError(
      result.error.issues[0]?.message ??
        "Rejection reason is required.",
      400,
    );
  }

  return result.data.reason;
}

function getCancelReason(
  req: Request,
): string | undefined {
  const result =
    cancelAppointmentSchema.safeParse(
      req.body ?? {},
    );

  if (!result.success) {
    throw new AppError(
      result.error.issues[0]?.message ??
        "Invalid cancellation details.",
      400,
    );
  }

  return result.data.reason;
}

export async function create(
  req: Request,
  res: Response,
) {
  const appointment =
    await createAppointment(
      getCreateInput(req),
    );

  res.status(201).json({
    success: true,
    message:
      "Appointment request submitted successfully.",
    data: appointment,
  });
}

export async function eligibility(
  req: Request,
  res: Response,
) {
  const result =
    await canClientBook(
      getClientId(req),
    );

  res.status(200).json({
    success: true,
    data: result,
  });
}

export async function getMine(
  req: Request,
  res: Response,
) {
  const appointments =
    await getClientAppointments(
      getClientId(req),
    );

  res.status(200).json({
    success: true,
    data: appointments,
  });
}

export async function getOne(
  req: Request,
  res: Response,
) {
  const appointmentId =
    getAppointmentId(req);

  const user =
    getAuthenticatedUser(req);

  const appointment =
    user.role === "client"
      ? await getClientAppointmentById(
          appointmentId,
          getClientId(req),
        )
      : await getAppointmentById(
          appointmentId,
        );

  res.status(200).json({
    success: true,
    data: appointment,
  });
}

export async function getAll(
  _req: Request,
  res: Response,
) {
  const appointments =
    await getAllAppointments();

  res.status(200).json({
    success: true,
    data: appointments,
  });
}

export async function accept(
  req: Request,
  res: Response,
) {
  const appointment =
    await acceptAppointment(
      getAcceptInput(req),
    );

  res.status(200).json({
    success: true,
    message:
      "Appointment accepted successfully.",
    data: appointment,
  });
}

export async function reject(
  req: Request,
  res: Response,
) {
  const appointment =
    await rejectAppointment(
      getAppointmentId(req),
      getRejectReason(req),
    );

  res.status(200).json({
    success: true,
    message:
      "Appointment rejected successfully.",
    data: appointment,
  });
}

export async function cancel(
  req: Request,
  res: Response,
) {
  const appointmentId =
    getAppointmentId(req);

  const user =
    getAuthenticatedUser(req);

  const reason =
    getCancelReason(req);

  const appointment =
    user.role === "client"
      ? await cancelClientAppointment(
          appointmentId,
          getClientId(req),
          reason,
        )
      : await cancelAppointment(
          appointmentId,
          reason,
        );

  res.status(200).json({
    success: true,
    message:
      "Appointment cancelled successfully.",
    data: appointment,
  });
}

export async function reschedule(
  req: Request,
  res: Response,
) {
  const appointment =
    await rescheduleAppointment(
      getRescheduleInput(req),
    );

  res.status(200).json({
    success: true,
    message:
      "Appointment rescheduled successfully.",
    data: appointment,
  });
}

export async function start(
  req: Request,
  res: Response,
) {
  const appointment =
    await startAppointment(
      getAppointmentId(req),
    );

  res.status(200).json({
    success: true,
    message:
      "Appointment started.",
    data: appointment,
  });
}

export async function complete(
  req: Request,
  res: Response,
) {
  const appointment =
    await completeAppointment(
      getAppointmentId(req),
    );

  res.status(200).json({
    success: true,
    message:
      "Appointment marked as completed.",
    data: appointment,
  });
}