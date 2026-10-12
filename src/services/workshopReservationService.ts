import mongoose from "mongoose";

import WorkshopReservation, {
  type IWorkshopReservation,
  type WorkshopReservationStatus,
} from "../models/WorkshopReservation.js";

import {
  Workshop,
  type IWorkshop,
} from "../models/Workshop.js";

import { Notification } from "../models/Notification.js";
import { Payment } from "../models/Payment.js";

import type { Currency } from "../config/currencies.js";
import { AppError } from "../utils/appError.js";

type WorkshopReservationDocument =
  mongoose.HydratedDocument<IWorkshopReservation>;

type MongoSession = mongoose.ClientSession;

export interface CreateWorkshopReservationInput {
  workshopId: string;
  clientId: string;
  ticketCode: string;
  ticketName: string;
  attendeeCount: number;
  amount: mongoose.Types.Decimal128;
  currency: Currency;
  fullName: string;
  email: string;
  phone?: string;
  organisationName?: string;
  expiresAt: Date;
  paymentId?: string;
}

export class WorkshopReservationServiceError extends AppError {
  constructor(message: string, statusCode = 400) {
    super(message, statusCode);
    this.name = "WorkshopReservationServiceError";
  }
}

export class WorkshopReservationNotFoundError extends WorkshopReservationServiceError {
  constructor() {
    super("The workshop reservation was not found.", 404);
  }
}

export class WorkshopReservationExpiredError extends WorkshopReservationServiceError {
  constructor() {
    super("The workshop reservation has expired.", 409);
  }
}

export class WorkshopReservationAlreadyCompletedError extends WorkshopReservationServiceError {
  constructor() {
    super("The workshop reservation has already been completed.", 409);
  }
}

export class WorkshopCapacityExceededError extends WorkshopReservationServiceError {
  constructor() {
    super(
      "There are not enough places available for the selected workshop ticket.",
      409,
    );
  }
}

export class WorkshopReservationPaymentConflictError extends WorkshopReservationServiceError {
  constructor() {
    super(
      "The payment is already associated with another workshop reservation.",
      409,
    );
  }
}

function validateObjectId(
  value: string,
  field: string,
): mongoose.Types.ObjectId {
  if (
    typeof value !== "string" ||
    !mongoose.Types.ObjectId.isValid(value)
  ) {
    throw new WorkshopReservationServiceError(
      `Invalid ${field}.`,
      400,
    );
  }

  return new mongoose.Types.ObjectId(value);
}

function requireNonEmptyString(
  value: string | undefined,
  field: string,
  maxLength: number,
): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new WorkshopReservationServiceError(
      `${field} is required.`,
      400,
    );
  }

  const normalized = value.trim();

  if (normalized.length > maxLength) {
    throw new WorkshopReservationServiceError(
      `${field} is too long.`,
      400,
    );
  }

  return normalized;
}

function optionalString(
  value: string | undefined,
  field: string,
  maxLength: number,
): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new WorkshopReservationServiceError(
      `${field} must be a string.`,
      400,
    );
  }

  const normalized = value.trim();

  if (!normalized) {
    return undefined;
  }

  if (normalized.length > maxLength) {
    throw new WorkshopReservationServiceError(
      `${field} is too long.`,
      400,
    );
  }

  return normalized;
}

function normalizeEmail(value: string): string {
  const email = value.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new WorkshopReservationServiceError(
      "Invalid email address.",
      400,
    );
  }

  if (email.length > 320) {
    throw new WorkshopReservationServiceError(
      "Email is too long.",
      400,
    );
  }

  return email;
}

function validateAttendeeCount(value: number): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new WorkshopReservationServiceError(
      "Attendee count must be a positive whole number.",
      400,
    );
  }
}

function validateAmount(
  value: mongoose.Types.Decimal128,
): void {
  if (!(value instanceof mongoose.Types.Decimal128)) {
    throw new WorkshopReservationServiceError(
      "Reservation amount is invalid.",
      400,
    );
  }

  const amount = Number(value.toString());

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new WorkshopReservationServiceError(
      "Reservation amount must be greater than zero.",
      400,
    );
  }
}

function validateDate(value: Date, field: string): void {
  if (
    !(value instanceof Date) ||
    Number.isNaN(value.getTime())
  ) {
    throw new WorkshopReservationServiceError(
      `Invalid ${field}.`,
      400,
    );
  }
}

function normalizeDecimalString(value: string): string {
  const trimmed = value.trim();

  const match = trimmed.match(
    /^([+-]?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/,
  );

  if (!match) {
    throw new WorkshopReservationServiceError(
      "Invalid decimal amount.",
      400,
    );
  }

  const sign = match[1] === "-" ? "-" : "";
  const integerPart = match[2] ?? "0";
  const fractionalPart = match[3] ?? "";
  const exponent = Number(match[4] ?? "0");

  if (
    !Number.isSafeInteger(exponent) ||
    Math.abs(exponent) > 10000
  ) {
    throw new WorkshopReservationServiceError(
      "Invalid decimal amount.",
      400,
    );
  }

  const digits = (integerPart + fractionalPart).replace(
    /^0+(?=\d)/,
    "",
  );

  const decimalPosition = integerPart.length + exponent;

  let normalizedInteger: string;
  let normalizedFraction: string;

  if (decimalPosition <= 0) {
    normalizedInteger = "0";
    normalizedFraction =
      "0".repeat(-decimalPosition) + digits;
  } else if (decimalPosition >= digits.length) {
    normalizedInteger =
      digits + "0".repeat(decimalPosition - digits.length);
    normalizedFraction = "";
  } else {
    normalizedInteger = digits.slice(0, decimalPosition);
    normalizedFraction = digits.slice(decimalPosition);
  }

  normalizedInteger =
    normalizedInteger.replace(/^0+(?=\d)/, "") || "0";

  normalizedFraction = normalizedFraction.replace(/0+$/, "");

  if (normalizedInteger === "0" && !normalizedFraction) {
    return "0";
  }

  return normalizedFraction
    ? `${sign}${normalizedInteger}.${normalizedFraction}`
    : `${sign}${normalizedInteger}`;
}

function decimalValuesEqual(
  left: mongoose.Types.Decimal128,
  right: mongoose.Types.Decimal128,
): boolean {
  return (
    normalizeDecimalString(left.toString()) ===
    normalizeDecimalString(right.toString())
  );
}

function isDuplicateKeyError(
  error: unknown,
): error is mongoose.mongo.MongoServerError {
  return (
    error instanceof mongoose.mongo.MongoServerError &&
    error.code === 11000
  );
}

function getTicketOrFail(
  workshop: IWorkshop,
  ticketCode: string,
) {
  const normalizedCode = ticketCode.trim().toLowerCase();

  const ticket = workshop.ticketTypes.find(
    (item) => item.code.trim().toLowerCase() === normalizedCode,
  );

  if (!ticket) {
    throw new WorkshopReservationServiceError(
      "The selected workshop ticket was not found.",
      404,
    );
  }

  if (!ticket.isActive) {
    throw new WorkshopReservationServiceError(
      "The selected workshop ticket is no longer available.",
      409,
    );
  }

  return ticket;
}

async function getWorkshopOrFail(
  workshopId: mongoose.Types.ObjectId,
  session?: MongoSession,
): Promise<IWorkshop> {
  const query = Workshop.findById(workshopId);

  if (session) {
    query.session(session);
  }

  const workshop = await query;

  if (!workshop) {
    throw new WorkshopReservationServiceError(
      "The associated workshop was not found.",
      404,
    );
  }

  return workshop;
}

function validateWorkshopAvailability(
  workshop: IWorkshop,
): void {
  const now = new Date();

  if (workshop.status !== "published") {
    throw new WorkshopReservationServiceError(
      "This workshop is not currently available for registration.",
      409,
    );
  }

  if (!workshop.registrationRequired) {
    throw new WorkshopReservationServiceError(
      "Registration is not required for this workshop.",
      409,
    );
  }

  if (workshop.startDate <= now) {
    throw new WorkshopReservationServiceError(
      "Registration for this workshop is no longer available because the workshop has started.",
      409,
    );
  }

  if (
    workshop.registrationDeadline &&
    workshop.registrationDeadline <= now
  ) {
    throw new WorkshopReservationServiceError(
      "Registration for this workshop has closed.",
      409,
    );
  }
}

async function reserveWorkshopCapacity(
  workshopId: mongoose.Types.ObjectId,
  attendeeCount: number,
  session: MongoSession,
): Promise<void> {
  validateAttendeeCount(attendeeCount);

  const workshop = await Workshop.findOneAndUpdate(
    {
      _id: workshopId,
      status: "published",
      $or: [
        { capacity: { $exists: false } },
        { capacity: null },
        {
          $expr: {
            $lte: [
              {
                $add: [
                  { $ifNull: ["$reservedCapacity", 0] },
                  attendeeCount,
                ],
              },
              "$capacity",
            ],
          },
        },
      ],
    },
    {
      $inc: {
        reservedCapacity: attendeeCount,
      },
    },
    {
      new: true,
      session,
    },
  );

  if (workshop) {
    return;
  }

  const currentWorkshop = await getWorkshopOrFail(
    workshopId,
    session,
  );

  validateWorkshopAvailability(currentWorkshop);
  throw new WorkshopCapacityExceededError();
}

async function releaseWorkshopCapacity(
  workshopId: mongoose.Types.ObjectId,
  attendeeCount: number,
  session: MongoSession,
): Promise<void> {
  validateAttendeeCount(attendeeCount);

  const result = await Workshop.updateOne(
    {
      _id: workshopId,
      reservedCapacity: {
        $gte: attendeeCount,
      },
    },
    {
      $inc: {
        reservedCapacity: -attendeeCount,
      },
    },
    { session },
  );

  if (result.modifiedCount !== 1) {
    throw new WorkshopReservationServiceError(
      "Workshop capacity could not be released safely. The reservation transition was rolled back.",
      409,
    );
  }
}

async function findReservationByPaymentId(
  paymentId: mongoose.Types.ObjectId,
  session?: MongoSession,
): Promise<WorkshopReservationDocument | null> {
  const query = WorkshopReservation.findOne({ paymentId });

  if (session) {
    query.session(session);
  }

  return query;
}

function isReusableReservation(
  reservation: WorkshopReservationDocument,
  clientId: mongoose.Types.ObjectId,
  workshopId: mongoose.Types.ObjectId,
  paymentId?: mongoose.Types.ObjectId,
): boolean {
  return (
    reservation.clientId.equals(clientId) &&
    reservation.workshopId.equals(workshopId) &&
    (
      !paymentId ||
      (
        reservation.paymentId !== undefined &&
        reservation.paymentId.equals(paymentId)
      )
    ) &&
    (
      reservation.status === "pending" ||
      reservation.status === "confirmed" ||
      reservation.status === "recovered"
    )
  );
}

async function getExistingReservationForRequest(
  clientId: mongoose.Types.ObjectId,
  workshopId: mongoose.Types.ObjectId,
  paymentId?: mongoose.Types.ObjectId,
  session?: MongoSession,
): Promise<WorkshopReservationDocument | null> {
  if (paymentId) {
    const paymentReservation = await findReservationByPaymentId(
      paymentId,
      session,
    );

    if (paymentReservation) {
      if (
        !paymentReservation.clientId.equals(clientId) ||
        !paymentReservation.workshopId.equals(workshopId)
      ) {
        throw new WorkshopReservationPaymentConflictError();
      }

      if (
        paymentReservation.status === "pending" &&
        paymentReservation.expiresAt <= new Date()
      ) {
        if (!session) {
          await expireWorkshopReservation(
            paymentReservation._id.toString(),
          );
        }

        throw new WorkshopReservationExpiredError();
      }

      if (
        paymentReservation.status === "expired" ||
        paymentReservation.status === "cancelled"
      ) {
        throw new WorkshopReservationAlreadyCompletedError();
      }

      if (
        isReusableReservation(
          paymentReservation,
          clientId,
          workshopId,
          paymentId,
        )
      ) {
        return paymentReservation;
      }

      throw new WorkshopReservationPaymentConflictError();
    }
  }

  const now = new Date();

  const query = WorkshopReservation.findOne({
    clientId,
    workshopId,
    $or: [
      { status: { $in: ["confirmed", "recovered"] } },
      { status: "pending", expiresAt: { $gt: now } },
    ],
  });

  if (session) {
    query.session(session);
  }

  const existingReservation = await query;

  if (!existingReservation) {
    return null;
  }

  if (
    paymentId &&
    existingReservation.paymentId?.equals(paymentId)
  ) {
    return existingReservation;
  }

  throw new WorkshopReservationServiceError(
    existingReservation.status === "pending"
      ? "You already have a pending reservation for this workshop. Complete the existing payment or wait for the reservation to expire."
      : "You already have a confirmed reservation for this workshop.",
    409,
  );
}

async function expireStaleReservationsForClientWorkshop(
  clientId: mongoose.Types.ObjectId,
  workshopId: mongoose.Types.ObjectId,
): Promise<void> {
  const staleReservations = await WorkshopReservation.find({
    clientId,
    workshopId,
    status: "pending",
    expiresAt: { $lte: new Date() },
  })
    .select("_id")
    .limit(100);

  for (const reservation of staleReservations) {
    await expireWorkshopReservation(reservation._id.toString());
  }
}

async function ensureWorkshopConfirmationNotification(
  reservation: WorkshopReservationDocument,
): Promise<void> {
  if (
    reservation.status !== "confirmed" &&
    reservation.status !== "recovered"
  ) {
    return;
  }

  const workshop = await Workshop.findById(
    reservation.workshopId,
  ).select("title");

  const workshopTitle =
    workshop?.title?.trim() || "your workshop";

  const notification = {
    userId: reservation.clientId,
    type: "workshop" as const,
    title: "Workshop reservation confirmed",
    message: `Your reservation for ${workshopTitle} is confirmed. Your place has been reserved successfully.`,
    link: `/portal/workshops/${reservation.workshopId.toString()}/register`,
    workshopReservationId: reservation._id,
  };

  try {
    await Notification.updateOne(
      {
        userId: reservation.clientId,
        type: "workshop",
        workshopReservationId: reservation._id,
      },
      {
        $setOnInsert: notification,
      },
      {
        upsert: true,
      },
    );
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const existingNotification = await Notification.exists({
        userId: reservation.clientId,
        type: "workshop",
        workshopReservationId: reservation._id,
      });

      if (existingNotification) {
        return;
      }
    }

    throw error;
  }
}

export async function assertNoBlockingWorkshopReservation(
  clientId: string,
  workshopId: string,
): Promise<void> {
  const clientObjectId = validateObjectId(clientId, "client ID");
  const workshopObjectId = validateObjectId(workshopId, "workshop ID");

  await expireStaleReservationsForClientWorkshop(
    clientObjectId,
    workshopObjectId,
  );

  await getExistingReservationForRequest(
    clientObjectId,
    workshopObjectId,
  );
}

export async function createWorkshopReservation(
  input: CreateWorkshopReservationInput,
): Promise<WorkshopReservationDocument> {
  const workshopId = validateObjectId(
    input.workshopId,
    "workshop ID",
  );

  const clientId = validateObjectId(input.clientId, "client ID");

  const paymentId = input.paymentId
    ? validateObjectId(input.paymentId, "payment ID")
    : undefined;

  const ticketCode = requireNonEmptyString(
    input.ticketCode,
    "Ticket code",
    50,
  ).toLowerCase();

  const ticketName = requireNonEmptyString(
    input.ticketName,
    "Ticket name",
    150,
  );

  const fullName = requireNonEmptyString(
    input.fullName,
    "Full name",
    200,
  );

  const email = normalizeEmail(input.email);
  const phone = optionalString(input.phone, "Phone", 50);

  const organisationName = optionalString(
    input.organisationName,
    "Organisation name",
    200,
  );

  validateAttendeeCount(input.attendeeCount);
  validateAmount(input.amount);
  validateDate(input.expiresAt, "reservation expiry date");

  if (input.expiresAt <= new Date()) {
    throw new WorkshopReservationServiceError(
      "Reservation expiry must be in the future.",
      400,
    );
  }

  await expireStaleReservationsForClientWorkshop(
    clientId,
    workshopId,
  );

  const existingReservation = await getExistingReservationForRequest(
    clientId,
    workshopId,
    paymentId,
  );

  if (existingReservation) {
    return existingReservation;
  }

  const session = await mongoose.startSession();

  try {
    let createdReservation: WorkshopReservationDocument | null = null;

    await session.withTransaction(async () => {
      const existing = await getExistingReservationForRequest(
        clientId,
        workshopId,
        paymentId,
        session,
      );

      if (existing) {
        createdReservation = existing;
        return;
      }

      const workshop = await getWorkshopOrFail(
        workshopId,
        session,
      );

      validateWorkshopAvailability(workshop);

      const selectedTicket = getTicketOrFail(
        workshop,
        ticketCode,
      );

      const attendeeCount = selectedTicket.attendeeCount;

      validateAttendeeCount(attendeeCount);

      if (attendeeCount !== input.attendeeCount) {
        throw new WorkshopReservationServiceError(
          "The selected ticket attendee count does not match the reservation.",
          409,
        );
      }

      const selectedTicketName = selectedTicket.name.trim();

      if (selectedTicketName !== ticketName) {
        throw new WorkshopReservationServiceError(
          "The selected ticket name does not match the current workshop ticket.",
          409,
        );
      }

      const configuredPrice = selectedTicket.pricing.get(
        input.currency,
      );

      if (!configuredPrice) {
        throw new WorkshopReservationServiceError(
          `The selected workshop ticket is not available in ${input.currency}.`,
          409,
        );
      }

      if (!decimalValuesEqual(configuredPrice, input.amount)) {
        throw new WorkshopReservationServiceError(
          "The reservation amount does not match the current workshop ticket price.",
          409,
        );
      }

      await reserveWorkshopCapacity(
        workshopId,
        attendeeCount,
        session,
      );

      const reservation = new WorkshopReservation({
        workshopId,
        clientId,
        paymentId,
        ticketCode: selectedTicket.code,
        ticketName: selectedTicketName,
        attendeeCount,
        amount: input.amount,
        currency: input.currency,
        fullName,
        email,
        phone,
        organisationName,
        status: "pending",
        expiresAt: input.expiresAt,
      });

      createdReservation = await reservation.save({ session });
    });

    if (!createdReservation) {
      throw new WorkshopReservationServiceError(
        "The workshop reservation could not be created.",
        500,
      );
    }

    return createdReservation;
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      throw new WorkshopReservationServiceError(
        error.message,
        400,
      );
    }

    if (isDuplicateKeyError(error)) {
      const existing = await getExistingReservationForRequest(
        clientId,
        workshopId,
        paymentId,
      );

      if (existing) {
        return existing;
      }

      throw new WorkshopReservationServiceError(
        "A reservation for this workshop already exists or the payment is already linked to another reservation.",
        409,
      );
    }

    throw error;
  } finally {
    await session.endSession();
  }
}

export async function getWorkshopReservationById(
  reservationId: string,
): Promise<WorkshopReservationDocument> {
  const id = validateObjectId(reservationId, "reservation ID");
  const reservation = await WorkshopReservation.findById(id);

  if (!reservation) {
    throw new WorkshopReservationNotFoundError();
  }

  return reservation;
}

export async function getWorkshopReservationByPaymentId(
  paymentId: string,
): Promise<WorkshopReservationDocument | null> {
  return findReservationByPaymentId(
    validateObjectId(paymentId, "payment ID"),
  );
}

export async function getPendingWorkshopReservationByPaymentId(
  paymentId: string,
): Promise<WorkshopReservationDocument | null> {
  return WorkshopReservation.findOne({
    paymentId: validateObjectId(paymentId, "payment ID"),
    status: "pending",
  });
}

export async function confirmWorkshopReservation(
  reservationId: string,
): Promise<WorkshopReservationDocument> {
  const id = validateObjectId(reservationId, "reservation ID");
  const now = new Date();

  const reservation = await WorkshopReservation.findById(id);

  if (!reservation) {
    throw new WorkshopReservationNotFoundError();
  }

  if (
    reservation.status === "confirmed" ||
    reservation.status === "recovered"
  ) {
    await ensureWorkshopConfirmationNotification(reservation);
    return reservation;
  }

  if (
    reservation.status === "expired" ||
    reservation.status === "cancelled"
  ) {
    throw new WorkshopReservationAlreadyCompletedError();
  }

  if (reservation.expiresAt <= now) {
    await expireWorkshopReservation(reservation._id.toString());
    throw new WorkshopReservationExpiredError();
  }

  const confirmed = await WorkshopReservation.findOneAndUpdate(
    {
      _id: id,
      status: "pending",
      expiresAt: { $gt: now },
    },
    {
      $set: {
        status: "confirmed",
        confirmedAt: now,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (confirmed) {
    await ensureWorkshopConfirmationNotification(confirmed);
    return confirmed;
  }

  const current = await WorkshopReservation.findById(id);

  if (!current) {
    throw new WorkshopReservationNotFoundError();
  }

  if (
    current.status === "confirmed" ||
    current.status === "recovered"
  ) {
    await ensureWorkshopConfirmationNotification(current);
    return current;
  }

  if (current.status === "expired") {
    throw new WorkshopReservationExpiredError();
  }

  if (current.status === "cancelled") {
    throw new WorkshopReservationAlreadyCompletedError();
  }

  if (current.expiresAt <= now) {
    await expireWorkshopReservation(current._id.toString());
    throw new WorkshopReservationExpiredError();
  }

  throw new WorkshopReservationServiceError(
    "The workshop reservation could not be confirmed.",
    409,
  );
}

export async function recoverExpiredWorkshopReservation(
  reservationId: string,
  paymentId: string,
): Promise<WorkshopReservationDocument> {
  const reservationObjectId = validateObjectId(
    reservationId,
    "reservation ID",
  );

  const paymentObjectId = validateObjectId(
    paymentId,
    "payment ID",
  );

  const session = await mongoose.startSession();

  try {
    let recoveredReservation: WorkshopReservationDocument | null = null;

    await session.withTransaction(async () => {
      const reservation = await WorkshopReservation.findById(
        reservationObjectId,
      ).session(session);

      if (!reservation) {
        throw new WorkshopReservationNotFoundError();
      }

      if (
        !reservation.paymentId ||
        !reservation.paymentId.equals(paymentObjectId)
      ) {
        throw new WorkshopReservationPaymentConflictError();
      }

      const payment = await Payment.findById(paymentObjectId)
        .session(session);

      if (!payment || payment.status !== "successful") {
        throw new WorkshopReservationServiceError(
          "The workshop reservation cannot be recovered without a successful payment.",
          409,
        );
      }

      if (
        payment.productType !== "workshop" ||
        !payment.clientId.equals(reservation.clientId) ||
        !payment.productId.equals(reservation.workshopId)
      ) {
        throw new WorkshopReservationPaymentConflictError();
      }

      if (
        reservation.status === "confirmed" ||
        reservation.status === "recovered"
      ) {
        recoveredReservation = reservation;
        return;
      }

      if (reservation.status !== "expired") {
        throw new WorkshopReservationServiceError(
          "Only an expired workshop reservation can be recovered.",
          409,
        );
      }

      const now = new Date();

      const workshop = await getWorkshopOrFail(
        reservation.workshopId,
        session,
      );

      validateWorkshopAvailability(workshop);

      await reserveWorkshopCapacity(
        reservation.workshopId,
        reservation.attendeeCount,
        session,
      );

      const recovered = await WorkshopReservation.findOneAndUpdate(
        {
          _id: reservation._id,
          status: "expired",
          paymentId: paymentObjectId,
        },
        {
          $set: {
            status: "recovered",
            recoveredAt: now,
          },
          $unset: {
            expiredAt: 1,
          },
        },
        {
          new: true,
          runValidators: true,
          session,
        },
      );

      if (!recovered) {
        throw new WorkshopReservationServiceError(
          "The reservation changed while recovery was in progress. Retry the operation.",
          409,
        );
      }

      recoveredReservation = recovered;
    });

    if (!recoveredReservation) {
      throw new WorkshopReservationServiceError(
        "The workshop reservation could not be recovered.",
        409,
      );
    }

    await ensureWorkshopConfirmationNotification(
      recoveredReservation,
    );

    return recoveredReservation;
  } finally {
    await session.endSession();
  }
}

export async function cancelWorkshopReservation(
  reservationId: string,
): Promise<WorkshopReservationDocument> {
  const id = validateObjectId(reservationId, "reservation ID");
  const session = await mongoose.startSession();

  try {
    let resultReservation: WorkshopReservationDocument | null = null;

    await session.withTransaction(async () => {
      const reservation = await WorkshopReservation.findById(id)
        .session(session);

      if (!reservation) {
        throw new WorkshopReservationNotFoundError();
      }

      if (
        reservation.status === "cancelled" ||
        reservation.status === "expired"
      ) {
        resultReservation = reservation;
        return;
      }

      if (reservation.status !== "pending") {
        throw new WorkshopReservationAlreadyCompletedError();
      }

      const now = new Date();

      const cancelled = await WorkshopReservation.findOneAndUpdate(
        {
          _id: id,
          status: "pending",
        },
        {
          $set: {
            status: "cancelled",
            cancelledAt: now,
          },
        },
        {
          new: true,
          runValidators: true,
          session,
        },
      );

      if (!cancelled) {
        throw new WorkshopReservationServiceError(
          "The workshop reservation could not be cancelled. Retry the operation.",
          409,
        );
      }

      await releaseWorkshopCapacity(
        cancelled.workshopId,
        cancelled.attendeeCount,
        session,
      );

      resultReservation = cancelled;
    });

    if (!resultReservation) {
      throw new WorkshopReservationServiceError(
        "The workshop reservation could not be cancelled.",
        409,
      );
    }

    return resultReservation;
  } finally {
    await session.endSession();
  }
}

export async function expireWorkshopReservation(
  reservationId: string,
): Promise<WorkshopReservationDocument> {
  const id = validateObjectId(reservationId, "reservation ID");
  const session = await mongoose.startSession();

  try {
    let resultReservation: WorkshopReservationDocument | null = null;

    await session.withTransaction(async () => {
      const reservation = await WorkshopReservation.findById(id)
        .session(session);

      if (!reservation) {
        throw new WorkshopReservationNotFoundError();
      }

      if (
        reservation.status === "expired" ||
        reservation.status === "cancelled"
      ) {
        resultReservation = reservation;
        return;
      }

      if (
        reservation.status === "confirmed" ||
        reservation.status === "recovered"
      ) {
        throw new WorkshopReservationAlreadyCompletedError();
      }

      const now = new Date();

      if (reservation.expiresAt > now) {
        throw new WorkshopReservationServiceError(
          "The workshop reservation has not expired yet.",
          409,
        );
      }

      const expired = await WorkshopReservation.findOneAndUpdate(
        {
          _id: id,
          status: "pending",
          expiresAt: { $lte: now },
        },
        {
          $set: {
            status: "expired",
            expiredAt: now,
          },
        },
        {
          new: true,
          runValidators: true,
          session,
        },
      );

      if (!expired) {
        throw new WorkshopReservationServiceError(
          "The reservation changed while expiry was in progress. Retry the operation.",
          409,
        );
      }

      await releaseWorkshopCapacity(
        expired.workshopId,
        expired.attendeeCount,
        session,
      );

      resultReservation = expired;
    });

    if (!resultReservation) {
      throw new WorkshopReservationServiceError(
        "The workshop reservation could not be expired.",
        409,
      );
    }

    return resultReservation;
  } finally {
    await session.endSession();
  }
}

export async function releaseWorkshopReservation(
  reservationId: string,
  reason: "cancelled" | "expired" = "cancelled",
): Promise<WorkshopReservationDocument> {
  return reason === "expired"
    ? expireWorkshopReservation(reservationId)
    : cancelWorkshopReservation(reservationId);
}

export async function expirePendingWorkshopReservations(
  limit = 100,
): Promise<number> {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new WorkshopReservationServiceError(
      "Expiration batch limit must be a positive whole number.",
      400,
    );
  }

  const reservations = await WorkshopReservation.find({
    status: "pending",
    expiresAt: { $lte: new Date() },
  })
    .sort({ expiresAt: 1 })
    .limit(Math.min(limit, 500))
    .select("_id");

  let expiredCount = 0;

  for (const reservation of reservations) {
    try {
      const expired = await expireWorkshopReservation(
        reservation._id.toString(),
      );

      if (expired.status === "expired") {
        expiredCount += 1;
      }
    } catch (error) {
      if (
        error instanceof WorkshopReservationAlreadyCompletedError ||
        error instanceof WorkshopReservationNotFoundError
      ) {
        continue;
      }

      throw error;
    }
  }

  return expiredCount;
}

export async function getMyPendingWorkshopReservation(
  clientId: string,
  workshopId?: string,
): Promise<WorkshopReservationDocument | null> {
  const filter: {
    clientId: mongoose.Types.ObjectId;
    status: WorkshopReservationStatus;
    workshopId?: mongoose.Types.ObjectId;
    expiresAt: { $gt: Date };
  } = {
    clientId: validateObjectId(clientId, "client ID"),
    status: "pending",
    expiresAt: { $gt: new Date() },
  };

  if (workshopId) {
    filter.workshopId = validateObjectId(
      workshopId,
      "workshop ID",
    );
  }

  return WorkshopReservation.findOne(filter).sort({
    createdAt: -1,
  });
}

export async function getWorkshopReservationsForWorkshop(
  workshopId: string,
  status?: WorkshopReservationStatus,
): Promise<WorkshopReservationDocument[]> {
  const filter: {
    workshopId: mongoose.Types.ObjectId;
    status?: WorkshopReservationStatus;
  } = {
    workshopId: validateObjectId(workshopId, "workshop ID"),
  };

  if (status) {
    filter.status = status;
  }

  return WorkshopReservation.find(filter).sort({
    createdAt: -1,
  });
}

export async function getMyWorkshopReservations(
  clientId: string,
): Promise<WorkshopReservationDocument[]> {
  return WorkshopReservation.find({
    clientId: validateObjectId(clientId, "client ID"),
  }).sort({
    createdAt: -1,
  });
}

export async function getMyWorkshopReservationByWorkshop(
  clientId: string,
  workshopId: string,
): Promise<WorkshopReservationDocument | null> {
  return WorkshopReservation.findOne({
    clientId: validateObjectId(clientId, "client ID"),
    workshopId: validateObjectId(workshopId, "workshop ID"),
  }).sort({
    createdAt: -1,
  });
}

export async function getMyWorkshopReservationByPayment(
  clientId: string,
  paymentId: string,
): Promise<WorkshopReservationDocument | null> {
  return WorkshopReservation.findOne({
    clientId: validateObjectId(clientId, "client ID"),
    paymentId: validateObjectId(paymentId, "payment ID"),
  });
}
