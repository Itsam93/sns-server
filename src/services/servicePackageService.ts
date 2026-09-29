import mongoose from "mongoose";

import {
  Service,
  type IService,
} from "../models/Service.js";
import {
  ServicePackage,
  type IServicePackage,
  type ServicePackageStatus,
} from "../models/ServicePackage.js";
import { Appointment } from "../models/Appointment.js";

const ACTIVE_PACKAGE_STATUS: ServicePackageStatus =
  "active";

type ServicePackageDocument =
  mongoose.HydratedDocument<IServicePackage>;

export interface CreateServicePackageInput {
  clientId: string;
  serviceId: string;
  purchasedAt?: Date;
  expiresAt?: Date;
}

export interface ServicePackageListQuery {
  page?: number;
  pageSize?: number;
  status?: ServicePackageStatus;
  serviceId?: string;
  clientId?: string;
}

export interface ServicePackageListResult {
  packages: ServicePackageDocument[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export class ServicePackageServiceError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(
    message: string,
    statusCode = 400,
    code = "SERVICE_PACKAGE_ERROR",
  ) {
    super(message);
    this.name =
      "ServicePackageServiceError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class ServicePackageNotFoundError extends ServicePackageServiceError {
  constructor() {
    super(
      "Service package was not found.",
      404,
      "SERVICE_PACKAGE_NOT_FOUND",
    );
  }
}

export class ServicePackageUnavailableError extends ServicePackageServiceError {
  constructor(
    message =
      "This service package is not available for use.",
  ) {
    super(
      message,
      409,
      "SERVICE_PACKAGE_UNAVAILABLE",
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
    throw new ServicePackageServiceError(
      `Invalid ${field}.`,
      400,
      "INVALID_OBJECT_ID",
    );
  }

  return new mongoose.Types.ObjectId(
    value,
  );
}

function normalizePage(
  value?: number,
): number {
  if (
    !value ||
    !Number.isInteger(value) ||
    value < 1
  ) {
    return 1;
  }

  return value;
}

function normalizePageSize(
  value?: number,
): number {
  if (
    !value ||
    !Number.isInteger(value) ||
    value < 1
  ) {
    return 20;
  }

  return Math.min(
    value,
    100,
  );
}

function getRemainingSessions(
  totalSessions: number,
  usedSessions: number,
): number {
  return Math.max(
    totalSessions - usedSessions,
    0,
  );
}

async function getServiceOrFail(
  serviceId: mongoose.Types.ObjectId,
): Promise<IService> {
  const service =
    await Service.findById(
      serviceId,
    );

  if (!service) {
    throw new ServicePackageServiceError(
      "The associated service was not found.",
      404,
      "SERVICE_NOT_FOUND",
    );
  }

  return service;
}

async function getPackageByIdOrFail(
  packageId: string,
): Promise<ServicePackageDocument> {
  const id =
    validateObjectId(
      packageId,
      "service package ID",
    );

  const servicePackage =
    await ServicePackage.findById(
      id,
    );

  if (!servicePackage) {
    throw new ServicePackageNotFoundError();
  }

  return servicePackage;
}

async function markExpiredIfNecessary(
  servicePackage: ServicePackageDocument,
): Promise<ServicePackageDocument> {
  if (
    servicePackage.status !==
    "active"
  ) {
    return servicePackage;
  }

  if (
    !servicePackage.expiresAt ||
    servicePackage.expiresAt >
      new Date()
  ) {
    return servicePackage;
  }

  servicePackage.status =
    "expired";

  servicePackage.remainingSessions =
    getRemainingSessions(
      servicePackage.totalSessions,
      servicePackage.usedSessions,
    );

  await servicePackage.save();

  return servicePackage;
}

export async function createServicePackage(
  input: CreateServicePackageInput,
): Promise<ServicePackageDocument> {
  const clientId =
    validateObjectId(
      input.clientId,
      "client ID",
    );

  const serviceId =
    validateObjectId(
      input.serviceId,
      "service ID",
    );

  const service =
    await getServiceOrFail(
      serviceId,
    );

  const totalSessions =
    service.type ===
    "session_package"
      ? service.sessionCount
      : 1;

  if (
    !totalSessions ||
    !Number.isInteger(
      totalSessions,
    ) ||
    totalSessions < 1
  ) {
    throw new ServicePackageServiceError(
      "The selected service does not have a valid session count.",
      409,
      "SERVICE_CONFIGURATION_ERROR",
    );
  }

  const purchasedAt =
    input.purchasedAt ??
    new Date();

  if (
    Number.isNaN(
      purchasedAt.getTime(),
    )
  ) {
    throw new ServicePackageServiceError(
      "Invalid purchase date.",
      400,
      "INVALID_PURCHASE_DATE",
    );
  }

  if (
    input.expiresAt &&
    input.expiresAt <=
      purchasedAt
  ) {
    throw new ServicePackageServiceError(
      "Package expiry must be later than the purchase date.",
      400,
      "INVALID_EXPIRY_DATE",
    );
  }

  return ServicePackage.create({
    clientId,
    serviceId,
    totalSessions,
    usedSessions: 0,
    remainingSessions:
      totalSessions,
    status: "active",
    purchasedAt,
    expiresAt:
      input.expiresAt,
  });
}

export async function getServicePackageById(
  packageId: string,
): Promise<ServicePackageDocument> {
  const servicePackage =
    await getPackageByIdOrFail(
      packageId,
    );

  return markExpiredIfNecessary(
    servicePackage,
  );
}

export async function getMyServicePackages(
  clientId: string,
  status?: ServicePackageStatus,
): Promise<ServicePackageDocument[]> {
  const clientObjectId =
    validateObjectId(
      clientId,
      "client ID",
    );

  const query: {
    clientId: mongoose.Types.ObjectId;
    status?: ServicePackageStatus;
  } = {
    clientId:
      clientObjectId,
  };

  if (status) {
    query.status = status;
  }

  const packages =
    await ServicePackage.find(
      query,
    ).sort({
      createdAt: -1,
    });

  const result: ServicePackageDocument[] =
    [];

  for (
    const servicePackage of packages
  ) {
    result.push(
      await markExpiredIfNecessary(
        servicePackage,
      ),
    );
  }

  return result;
}

export async function getActiveServicePackage(
  clientId: string,
  serviceId: string,
): Promise<ServicePackageDocument | null> {
  const clientObjectId =
    validateObjectId(
      clientId,
      "client ID",
    );

  const serviceObjectId =
    validateObjectId(
      serviceId,
      "service ID",
    );

  const servicePackage =
    await ServicePackage.findOne({
      clientId:
        clientObjectId,
      serviceId:
        serviceObjectId,
      status:
        ACTIVE_PACKAGE_STATUS,
      remainingSessions: {
        $gt: 0,
      },
    }).sort({
      createdAt: -1,
    });

  if (!servicePackage) {
    return null;
  }

  return markExpiredIfNecessary(
    servicePackage,
  );
}

export async function getAllServicePackages(
  query: ServicePackageListQuery = {},
): Promise<ServicePackageListResult> {
  const page =
    normalizePage(
      query.page,
    );

  const pageSize =
    normalizePageSize(
      query.pageSize,
    );

  const filter: {
    status?: ServicePackageStatus;
    clientId?: mongoose.Types.ObjectId;
    serviceId?: mongoose.Types.ObjectId;
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

  if (query.serviceId) {
    filter.serviceId =
      validateObjectId(
        query.serviceId,
        "service ID",
      );
  }

  const skip =
    (page - 1) *
    pageSize;

  const [
    packages,
    total,
  ] =
    await Promise.all([
      ServicePackage.find(
        filter,
      )
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(pageSize),

      ServicePackage.countDocuments(
        filter,
      ),
    ]);

  return {
    packages,
    page,
    pageSize,
    total,
    totalPages:
      Math.ceil(
        total / pageSize,
      ),
  };
}

export async function consumeSession(
  packageId: string,
): Promise<ServicePackageDocument> {
  const id =
    validateObjectId(
      packageId,
      "service package ID",
    );

  const now =
    new Date();

  const servicePackage =
    await ServicePackage.findOneAndUpdate(
      {
        _id: id,
        status: "active",
        remainingSessions: {
          $gt: 0,
        },
        $or: [
          {
            expiresAt: {
              $exists: false,
            },
          },
          {
            expiresAt: {
              $gt: now,
            },
          },
        ],
      },
      {
        $inc: {
          usedSessions: 1,
          remainingSessions:
            -1,
        },
        $set: {
          lastUsedAt:
            now,
        },
      },
      {
        new: true,
      },
    );

  if (!servicePackage) {
    const existing =
      await ServicePackage.findById(
        id,
      );

    if (!existing) {
      throw new ServicePackageNotFoundError();
    }

    await markExpiredIfNecessary(
      existing,
    );

    throw new ServicePackageUnavailableError(
      existing.status ===
        "completed"
        ? "This service package has no remaining sessions."
        : existing.status ===
            "expired"
          ? "This service package has expired."
          : "This service package is not available for use.",
    );
  }

  if (
    servicePackage.remainingSessions ===
    0
  ) {
    servicePackage.status =
      "completed";

    await servicePackage.save();
  }

  return servicePackage;
}

export async function restoreSession(
  packageId: string,
): Promise<ServicePackageDocument> {
  const id =
    validateObjectId(
      packageId,
      "service package ID",
    );

  const servicePackage =
    await ServicePackage.findById(
      id,
    );

  if (!servicePackage) {
    throw new ServicePackageNotFoundError();
  }

  if (
    servicePackage.usedSessions <=
    0
  ) {
    throw new ServicePackageServiceError(
      "There is no consumed session to restore.",
      409,
      "NO_SESSION_TO_RESTORE",
    );
  }

  if (
    servicePackage.status ===
    "cancelled"
  ) {
    throw new ServicePackageUnavailableError(
      "A cancelled service package cannot have a session restored.",
    );
  }

  servicePackage.usedSessions -=
    1;

  servicePackage.remainingSessions +=
    1;

  servicePackage.status =
    servicePackage.expiresAt &&
    servicePackage.expiresAt <=
      new Date()
      ? "expired"
      : "active";

  await servicePackage.save();

  return servicePackage;
}

export async function completeServicePackage(
  packageId: string,
): Promise<ServicePackageDocument> {
  const servicePackage =
    await getPackageByIdOrFail(
      packageId,
    );

  if (
    servicePackage.usedSessions <
    servicePackage.totalSessions
  ) {
    throw new ServicePackageServiceError(
      "A service package cannot be completed while sessions remain.",
      409,
      "PACKAGE_SESSIONS_REMAIN",
    );
  }

  servicePackage.usedSessions =
    servicePackage.totalSessions;

  servicePackage.remainingSessions =
    0;

  servicePackage.status =
    "completed";

  await servicePackage.save();

  return servicePackage;
}

export async function expireServicePackage(
  packageId: string,
): Promise<ServicePackageDocument> {
  const servicePackage =
    await getPackageByIdOrFail(
      packageId,
    );

  if (
    servicePackage.status ===
      "completed" ||
    servicePackage.status ===
      "cancelled"
  ) {
    return servicePackage;
  }

  servicePackage.status =
    "expired";

  await servicePackage.save();

  return servicePackage;
}

export async function cancelServicePackage(
  packageId: string,
): Promise<ServicePackageDocument> {
  const servicePackage =
    await getPackageByIdOrFail(
      packageId,
    );

  if (
    servicePackage.status ===
    "completed"
  ) {
    throw new ServicePackageServiceError(
      "A completed service package cannot be cancelled.",
      409,
      "PACKAGE_ALREADY_COMPLETED",
    );
  }

  servicePackage.status =
    "cancelled";

  await servicePackage.save();

  return servicePackage;
}

export async function getServicePackageUsage(
  packageId: string,
): Promise<{
  package: ServicePackageDocument;
  totalSessions: number;
  usedSessions: number;
  remainingSessions: number;
  status: ServicePackageStatus;
}> {
  const servicePackage =
    await getServicePackageById(
      packageId,
    );

  return {
    package:
      servicePackage,
    totalSessions:
      servicePackage.totalSessions,
    usedSessions:
      servicePackage.usedSessions,
    remainingSessions:
      servicePackage.remainingSessions,
    status:
      servicePackage.status,
  };
}

export async function hasUsableServicePackage(
  clientId: string,
  serviceId: string,
): Promise<boolean> {
  const servicePackage =
    await getActiveServicePackage(
      clientId,
      serviceId,
    );

  return (
    servicePackage !== null &&
    servicePackage.status ===
      "active" &&
    servicePackage.remainingSessions >
      0
  );
}

export async function getServicePackageForAppointment(
  appointmentId: string,
): Promise<ServicePackageDocument | null> {
  const appointmentObjectId =
    validateObjectId(
      appointmentId,
      "appointment ID",
    );

  const appointment =
    await Appointment.findById(
      appointmentObjectId,
    ).select(
      "servicePackageId",
    );

  if (
    !appointment ||
    !appointment.servicePackageId
  ) {
    return null;
  }

  const servicePackage =
    await ServicePackage.findById(
      appointment.servicePackageId,
    );

  if (!servicePackage) {
    throw new ServicePackageNotFoundError();
  }

  return markExpiredIfNecessary(
    servicePackage,
  );
}

export async function consumeSessionForAppointment(
  appointmentId: string,
): Promise<ServicePackageDocument> {
  const appointmentObjectId =
    validateObjectId(
      appointmentId,
      "appointment ID",
    );

  const appointment =
    await Appointment.findById(
      appointmentObjectId,
    ).select(
      "servicePackageId status",
    );

  if (!appointment) {
    throw new ServicePackageServiceError(
      "Appointment was not found.",
      404,
      "APPOINTMENT_NOT_FOUND",
    );
  }

  if (
    !appointment.servicePackageId
  ) {
    throw new ServicePackageServiceError(
      "This appointment is not linked to a service package.",
      409,
      "SERVICE_PACKAGE_NOT_LINKED",
    );
  }

  if (
    appointment.status !==
    "completed"
  ) {
    throw new ServicePackageServiceError(
      "A service package session can only be consumed for a completed appointment.",
      409,
      "APPOINTMENT_NOT_COMPLETED",
    );
  }

  return consumeSession(
    String(
      appointment.servicePackageId,
    ),
  );
}

export async function syncExpiredServicePackages(): Promise<number> {
  const result =
    await ServicePackage.updateMany(
      {
        status: "active",
        expiresAt: {
          $lte: new Date(),
        },
      },
      {
        $set: {
          status: "expired",
        },
      },
    );

  return result.modifiedCount;
}

export async function getClientServicePackageForService(
  clientId: string,
  serviceId: string,
): Promise<ServicePackageDocument | null> {
  return getActiveServicePackage(
    clientId,
    serviceId,
  );
}