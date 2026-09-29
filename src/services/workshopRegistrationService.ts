import mongoose from "mongoose";

import {
  Workshop,
  type IWorkshop,
} from "../models/Workshop.js";
import {
  WorkshopRegistration,
  type IWorkshopRegistration,
} from "../models/WorkshopRegistration.js";
import type { Currency } from "../config/currencies.js";
import { AppError } from "../utils/appError.js";

type WorkshopRegistrationDocument =
  mongoose.HydratedDocument<IWorkshopRegistration>;

export type WorkshopRegistrationStatus =
  | "registered"
  | "attended"
  | "cancelled"
  | "refunded";

export interface CreateWorkshopRegistrationInput {
  clientId?: string;
  workshopId: string;
  paymentId: string;
  ticketCode: string;
  ticketName: string;
  attendeeCount: number;
  amountPaid: mongoose.Types.Decimal128;
  currency: Currency;
  fullName: string;
  email: string;
  phone?: string;
  organisationName?: string;
  registeredAt?: Date;
}

export interface WorkshopRegistrationListQuery {
  page?: number;
  pageSize?: number;
  status?: WorkshopRegistrationStatus;
  clientId?: string;
  workshopId?: string;
  ticketCode?: string;
}

export interface WorkshopRegistrationListResult {
  registrations: WorkshopRegistrationDocument[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export class WorkshopRegistrationServiceError extends AppError {
  constructor(
    message: string,
    statusCode = 400,
  ) {
    super(
      message,
      statusCode,
    );
    this.name =
      "WorkshopRegistrationServiceError";
  }
}

export class WorkshopRegistrationNotFoundError extends WorkshopRegistrationServiceError {
  constructor() {
    super(
      "Workshop registration was not found.",
      404,
    );
  }
}

export class WorkshopRegistrationAlreadyExistsError extends WorkshopRegistrationServiceError {
  constructor() {
    super(
      "A workshop registration already exists for this payment.",
      409,
    );
  }
}

function validateObjectId(
  value: string,
  field: string,
): mongoose.Types.ObjectId {
  if (
    !mongoose.Types.ObjectId.isValid(
      value,
    )
  ) {
    throw new WorkshopRegistrationServiceError(
      `Invalid ${field}.`,
      400,
    );
  }

  return new mongoose.Types.ObjectId(
    value,
  );
}

function requireNonEmptyString(
  value: string | undefined,
  field: string,
  maxLength: number,
): string {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new WorkshopRegistrationServiceError(
      `${field} is required.`,
      400,
    );
  }

  const normalized =
    value.trim();

  if (
    normalized.length >
    maxLength
  ) {
    throw new WorkshopRegistrationServiceError(
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
  if (
    value === undefined ||
    value === null
  ) {
    return undefined;
  }

  if (
    typeof value !== "string"
  ) {
    throw new WorkshopRegistrationServiceError(
      `${field} must be a string.`,
      400,
    );
  }

  const normalized =
    value.trim();

  if (!normalized) {
    return undefined;
  }

  if (
    normalized.length >
    maxLength
  ) {
    throw new WorkshopRegistrationServiceError(
      `${field} is too long.`,
      400,
    );
  }

  return normalized;
}

function normalizeEmail(
  value: string,
): string {
  const email =
    value
      .trim()
      .toLowerCase();

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email,
    )
  ) {
    throw new WorkshopRegistrationServiceError(
      "Invalid email address.",
      400,
    );
  }

  return email;
}

function validateAttendeeCount(
  value: number,
): void {
  if (
    !Number.isInteger(value) ||
    value < 1
  ) {
    throw new WorkshopRegistrationServiceError(
      "Attendee count must be a positive whole number.",
      400,
    );
  }
}

function validateAmount(
  value: mongoose.Types.Decimal128,
): void {
  const amount =
    Number(
      value.toString(),
    );

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    throw new WorkshopRegistrationServiceError(
      "Registration amount must be greater than zero.",
      400,
    );
  }
}

function validateDate(
  value: Date,
  field: string,
): void {
  if (
    Number.isNaN(
      value.getTime(),
    )
  ) {
    throw new WorkshopRegistrationServiceError(
      `Invalid ${field}.`,
      400,
    );
  }
}

async function getWorkshopOrFail(
  workshopId: mongoose.Types.ObjectId,
): Promise<IWorkshop> {
  const workshop =
    await Workshop.findById(
      workshopId,
    );

  if (!workshop) {
    throw new WorkshopRegistrationServiceError(
      "The associated workshop was not found.",
      404,
    );
  }

  return workshop;
}

async function getRegistrationByIdOrFail(
  registrationId: string,
): Promise<WorkshopRegistrationDocument> {
  const id =
    validateObjectId(
      registrationId,
      "workshop registration ID",
    );

  const registration =
    await WorkshopRegistration.findById(
      id,
    );

  if (!registration) {
    throw new WorkshopRegistrationNotFoundError();
  }

  return registration;
}

function getTicketOrFail(
  workshop: IWorkshop,
  ticketCode: string,
) {
  const normalizedCode =
    ticketCode
      .trim()
      .toLowerCase();

  const ticket =
    workshop.ticketTypes.find(
      (item) =>
        item.code
          .trim()
          .toLowerCase() ===
        normalizedCode,
    );

  if (!ticket) {
    throw new WorkshopRegistrationServiceError(
      "The selected workshop ticket was not found.",
      404,
    );
  }

  if (!ticket.isActive) {
    throw new WorkshopRegistrationServiceError(
      "The selected workshop ticket is no longer available.",
      409,
    );
  }

  return ticket;
}

export async function createWorkshopRegistration(
  input: CreateWorkshopRegistrationInput,
): Promise<WorkshopRegistrationDocument> {
  const workshopId =
    validateObjectId(
      input.workshopId,
      "workshop ID",
    );

  const paymentId =
    validateObjectId(
      input.paymentId,
      "payment ID",
    );

  const clientId =
    input.clientId
      ? validateObjectId(
          input.clientId,
          "client ID",
        )
      : undefined;

  const workshop =
    await getWorkshopOrFail(
      workshopId,
    );

  const existing =
    await WorkshopRegistration.findOne({
      paymentId,
    });

  if (existing) {
    throw new WorkshopRegistrationAlreadyExistsError();
  }

  const ticketCode =
    requireNonEmptyString(
      input.ticketCode,
      "Ticket code",
      100,
    ).toLowerCase();

  const ticketName =
    requireNonEmptyString(
      input.ticketName,
      "Ticket name",
      150,
    );

  const selectedTicket =
    getTicketOrFail(
      workshop,
      ticketCode,
    );

  if (
    selectedTicket.name !==
    ticketName
  ) {
    throw new WorkshopRegistrationServiceError(
      "The workshop ticket name does not match the selected ticket.",
      409,
    );
  }

  validateAttendeeCount(
    input.attendeeCount,
  );

  if (
    input.attendeeCount !==
    selectedTicket.attendeeCount
  ) {
    throw new WorkshopRegistrationServiceError(
      "Attendee count does not match the selected workshop ticket.",
      400,
    );
  }

  validateAmount(
    input.amountPaid,
  );

  const fullName =
    requireNonEmptyString(
      input.fullName,
      "Full name",
      200,
    );

  const email =
    normalizeEmail(
      input.email,
    );

  const phone =
    optionalString(
      input.phone,
      "Phone",
      50,
    );

  const organisationName =
    optionalString(
      input.organisationName,
      "Organisation name",
      200,
    );

  const registeredAt =
    input.registeredAt ??
    new Date();

  validateDate(
    registeredAt,
    "registration date",
  );

  try {
    return await WorkshopRegistration.create({
      clientId,
      workshopId,
      paymentId,
      ticketCode,
      ticketName,
      attendeeCount:
        input.attendeeCount,
      amountPaid:
        input.amountPaid,
      currency:
        input.currency,
      fullName,
      email,
      phone,
      organisationName,
      status: "registered",
      registeredAt,
    });
  } catch (error) {
    if (
      error instanceof
      mongoose.Error.ValidationError
    ) {
      throw new WorkshopRegistrationServiceError(
        error.message,
        400,
      );
    }

    if (
      error instanceof
        mongoose.mongo.MongoServerError &&
      error.code === 11000
    ) {
      throw new WorkshopRegistrationAlreadyExistsError();
    }

    throw error;
  }
}

export async function getWorkshopRegistrationById(
  registrationId: string,
): Promise<WorkshopRegistrationDocument> {
  return getRegistrationByIdOrFail(
    registrationId,
  );
}

export async function getWorkshopRegistrationByPaymentId(
  paymentId: string,
): Promise<WorkshopRegistrationDocument | null> {
  const paymentObjectId =
    validateObjectId(
      paymentId,
      "payment ID",
    );

  return WorkshopRegistration.findOne({
    paymentId:
      paymentObjectId,
  });
}

export async function getWorkshopRegistrationByClientAndPayment(
  clientId: string,
  paymentId: string,
): Promise<WorkshopRegistrationDocument | null> {
  const clientObjectId =
    validateObjectId(
      clientId,
      "client ID",
    );

  const paymentObjectId =
    validateObjectId(
      paymentId,
      "payment ID",
    );

  return WorkshopRegistration.findOne({
    clientId:
      clientObjectId,
    paymentId:
      paymentObjectId,
  });
}

export async function getMyWorkshopRegistrations(
  clientId: string,
  status?: WorkshopRegistrationStatus,
): Promise<WorkshopRegistrationDocument[]> {
  const clientObjectId =
    validateObjectId(
      clientId,
      "client ID",
    );

  const filter: {
    clientId: mongoose.Types.ObjectId;
    status?: WorkshopRegistrationStatus;
  } = {
    clientId:
      clientObjectId,
  };

  if (status) {
    filter.status =
      status;
  }

  return WorkshopRegistration.find(
    filter,
  ).sort({
    registeredAt: -1,
    createdAt: -1,
  });
}

export async function getMyWorkshopRegistration(
  clientId: string,
  workshopId: string,
): Promise<WorkshopRegistrationDocument | null> {
  const clientObjectId =
    validateObjectId(
      clientId,
      "client ID",
    );

  const workshopObjectId =
    validateObjectId(
      workshopId,
      "workshop ID",
    );

  return WorkshopRegistration.findOne({
    clientId:
      clientObjectId,
    workshopId:
      workshopObjectId,
    status: {
      $in: [
        "registered",
        "attended",
      ],
    },
  }).sort({
    registeredAt: -1,
  });
}

export async function hasWorkshopRegistration(
  clientId: string,
  workshopId: string,
): Promise<boolean> {
  const registration =
    await getMyWorkshopRegistration(
      clientId,
      workshopId,
    );

  return registration !== null;
}

export async function getWorkshopRegistrationsForWorkshop(
  workshopId: string,
  status?: WorkshopRegistrationStatus,
): Promise<WorkshopRegistrationDocument[]> {
  const workshopObjectId =
    validateObjectId(
      workshopId,
      "workshop ID",
    );

  const filter: {
    workshopId: mongoose.Types.ObjectId;
    status?: WorkshopRegistrationStatus;
  } = {
    workshopId:
      workshopObjectId,
  };

  if (status) {
    filter.status =
      status;
  }

  return WorkshopRegistration.find(
    filter,
  ).sort({
    registeredAt: -1,
  });
}

export async function getWorkshopRegistrationsByTicket(
  workshopId: string,
  ticketCode: string,
): Promise<WorkshopRegistrationDocument[]> {
  const workshopObjectId =
    validateObjectId(
      workshopId,
      "workshop ID",
    );

  const normalizedTicketCode =
    requireNonEmptyString(
      ticketCode,
      "Ticket code",
      100,
    ).toLowerCase();

  return WorkshopRegistration.find({
    workshopId:
      workshopObjectId,
    ticketCode:
      normalizedTicketCode,
    status: {
      $in: [
        "registered",
        "attended",
      ],
    },
  }).sort({
    registeredAt: -1,
  });
}

export async function getAllWorkshopRegistrations(
  query: WorkshopRegistrationListQuery = {},
): Promise<WorkshopRegistrationListResult> {
  const page =
    Number.isInteger(
      query.page,
    ) &&
    query.page! > 0
      ? query.page!
      : 1;

  const pageSize =
    Number.isInteger(
      query.pageSize,
    ) &&
    query.pageSize! > 0
      ? Math.min(
          query.pageSize!,
          100,
        )
      : 20;

  const filter: {
    status?: WorkshopRegistrationStatus;
    clientId?: mongoose.Types.ObjectId;
    workshopId?: mongoose.Types.ObjectId;
    ticketCode?: string;
  } = {};

  if (query.status) {
    filter.status =
      query.status;
  }

  if (query.clientId) {
    filter.clientId =
      validateObjectId(
        query.clientId,
        "client ID",
      );
  }

  if (query.workshopId) {
    filter.workshopId =
      validateObjectId(
        query.workshopId,
        "workshop ID",
      );
  }

  if (query.ticketCode) {
    filter.ticketCode =
      query.ticketCode
        .trim()
        .toLowerCase();
  }

  const skip =
    (page - 1) *
    pageSize;

  const [
    registrations,
    total,
  ] = await Promise.all([
    WorkshopRegistration.find(
      filter,
    )
      .sort({
        registeredAt: -1,
        createdAt: -1,
      })
      .skip(skip)
      .limit(pageSize),

    WorkshopRegistration.countDocuments(
      filter,
    ),
  ]);

  return {
    registrations,
    page,
    pageSize,
    total,
    totalPages:
      Math.ceil(
        total / pageSize,
      ),
  };
}

export async function markWorkshopRegistrationAttended(
  registrationId: string,
): Promise<WorkshopRegistrationDocument> {
  const registration =
    await getRegistrationByIdOrFail(
      registrationId,
    );

  if (
    registration.status ===
    "refunded"
  ) {
    throw new WorkshopRegistrationServiceError(
      "A refunded workshop registration cannot be marked as attended.",
      409,
    );
  }

  if (
    registration.status ===
    "cancelled"
  ) {
    throw new WorkshopRegistrationServiceError(
      "A cancelled workshop registration cannot be marked as attended.",
      409,
    );
  }

  if (
    registration.status ===
    "attended"
  ) {
    return registration;
  }

  registration.status =
    "attended";

  registration.attendedAt =
    new Date();

  registration.cancelledAt =
    undefined;

  await registration.save();

  return registration;
}

export async function cancelWorkshopRegistration(
  registrationId: string,
): Promise<WorkshopRegistrationDocument> {
  const registration =
    await getRegistrationByIdOrFail(
      registrationId,
    );

  if (
    registration.status ===
    "attended"
  ) {
    throw new WorkshopRegistrationServiceError(
      "An attended workshop registration cannot be cancelled.",
      409,
    );
  }

  if (
    registration.status ===
    "refunded"
  ) {
    throw new WorkshopRegistrationServiceError(
      "A refunded workshop registration cannot be cancelled.",
      409,
    );
  }

  if (
    registration.status ===
    "cancelled"
  ) {
    return registration;
  }

  registration.status =
    "cancelled";

  registration.cancelledAt =
    new Date();

  registration.attendedAt =
    undefined;

  await registration.save();

  return registration;
}

export async function refundWorkshopRegistration(
  registrationId: string,
): Promise<WorkshopRegistrationDocument> {
  const registration =
    await getRegistrationByIdOrFail(
      registrationId,
    );

  if (
    registration.status ===
    "refunded"
  ) {
    return registration;
  }

  registration.status =
    "refunded";

  registration.refundedAt =
    new Date();

  registration.attendedAt =
    undefined;

  registration.cancelledAt =
    undefined;

  await registration.save();

  return registration;
}

export async function countWorkshopRegistrations(
  workshopId: string,
): Promise<number> {
  const workshopObjectId =
    validateObjectId(
      workshopId,
      "workshop ID",
    );

  return WorkshopRegistration.countDocuments({
    workshopId:
      workshopObjectId,
    status: {
      $in: [
        "registered",
        "attended",
      ],
    },
  });
}

export async function countWorkshopAttendees(
  workshopId: string,
): Promise<number> {
  const workshopObjectId =
    validateObjectId(
      workshopId,
      "workshop ID",
    );

  const result =
    await WorkshopRegistration.aggregate<{
      total: number;
    }>([
      {
        $match: {
          workshopId:
            workshopObjectId,
          status: {
            $in: [
              "registered",
              "attended",
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum:
              "$attendeeCount",
          },
        },
      },
    ]);

  return result[0]?.total ?? 0;
}