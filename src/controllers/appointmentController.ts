import type { Request, Response } from "express";

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
import { AppError } from "../utils/appError.js";

function getAppointmentId(req: Request) {
  const { id } = req.params;

  if (
    typeof id !== "string" ||
    !id.trim()
  ) {
    throw new AppError(
      "Appointment ID is required.",
      400,
    );
  }

  return id;
}

function getClientId(req: Request) {
  const clientId = req.user?.clientId;

  if (
    !clientId ||
    !clientId.trim()
  ) {
    throw new AppError(
      "Client profile not found.",
      404,
    );
  }

  return clientId;
}

function getAuthenticatedUser(req: Request) {
  const user = req.user;

  if (!user) {
    throw new AppError(
      "Authentication required.",
      401,
    );
  }

  return user;
}

export async function create(
  req: Request,
  res: Response,
) {
  const appointment =
    await createAppointment({
      clientId: getClientId(req),
      ...req.body,
    });

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
    await acceptAppointment({
      appointmentId:
        getAppointmentId(req),
      ...req.body,
    });

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
      req.body.reason,
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

  const appointment =
    user.role === "client"
      ? await cancelClientAppointment(
          appointmentId,
          getClientId(req),
          req.body.reason,
        )
      : await cancelAppointment(
          appointmentId,
          req.body.reason,
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
    await rescheduleAppointment({
      appointmentId:
        getAppointmentId(req),
      ...req.body,
    });

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