import type { Request, Response } from "express";

import {
  getMyWorkshopReservationByPayment,
  getMyWorkshopReservationByWorkshop,
  getMyWorkshopReservations,
} from "../services/workshopReservationService.js";

import { AppError } from "../utils/appError.js";

import {
  workshopRegistrationPaymentIdSchema,
  workshopRegistrationWorkshopIdSchema,
} from "../utils/workshopRegistrationValidation.js";

function getClientId(req: Request): string {
  const clientId = req.user?.clientId;

  if (typeof clientId !== "string" || !clientId.trim()) {
    throw new AppError("Authenticated client is required.", 401);
  }

  return clientId.trim();
}

function getWorkshopId(req: Request): string {
  const result = workshopRegistrationWorkshopIdSchema.safeParse({
    workshopId: req.params.workshopId,
  });

  if (!result.success) {
    throw new AppError("Invalid workshop ID.", 400);
  }

  return result.data.workshopId;
}

function getPaymentId(req: Request): string {
  const result = workshopRegistrationPaymentIdSchema.safeParse({
    paymentId: req.params.paymentId,
  });

  if (!result.success) {
    throw new AppError("Invalid payment ID.", 400);
  }

  return result.data.paymentId;
}

export async function getMyWorkshopReservationsController(
  req: Request,
  res: Response,
) {
  const reservations = await getMyWorkshopReservations(
    getClientId(req),
  );

  return res.status(200).json({
    success: true,
    data: reservations,
  });
}

export async function getMyWorkshopReservationByWorkshopController(
  req: Request,
  res: Response,
) {
  const reservation = await getMyWorkshopReservationByWorkshop(
    getClientId(req),
    getWorkshopId(req),
  );

  return res.status(200).json({
    success: true,
    data: reservation,
  });
}

export async function getMyWorkshopReservationByPaymentController(
  req: Request,
  res: Response,
) {
  const reservation = await getMyWorkshopReservationByPayment(
    getClientId(req),
    getPaymentId(req),
  );

  return res.status(200).json({
    success: true,
    data: reservation,
  });
}