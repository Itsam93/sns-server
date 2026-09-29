import type { Request, Response } from "express";

import {
  getAllServicePackages,
  getClientServicePackageForService,
  getMyServicePackages,
  getServicePackageById,
  getServicePackageForAppointment,
  getServicePackageUsage,
  hasUsableServicePackage,
} from "../services/servicePackageService.js";

import {
  servicePackageClientIdSchema,
  servicePackageIdSchema,
  servicePackageServiceIdSchema,
  servicePackageStatusUpdateSchema,
} from "../utils/servicePackageValidation.js";

import { AppError } from "../utils/appError.js";

function getClientId(req: Request): string {
  const clientId = req.user?.clientId;

  if (
    typeof clientId !== "string" ||
    !clientId.trim()
  ) {
    throw new AppError(
      "Authenticated client is required.",
      401,
    );
  }

  return clientId.trim();
}

function getServicePackageId(req: Request): string {
  const result = servicePackageIdSchema.safeParse({
    id: req.params.id,
  });

  if (!result.success) {
    throw new AppError(
      "Invalid service package ID.",
      400,
    );
  }

  return result.data.id;
}

function getServiceId(req: Request): string {
  const result =
    servicePackageServiceIdSchema.safeParse({
      serviceId: req.params.serviceId,
    });

  if (!result.success) {
    throw new AppError(
      "Invalid service ID.",
      400,
    );
  }

  return result.data.serviceId;
}

function getAppointmentId(req: Request): string {
  const appointmentId = req.params.appointmentId;

  if (
    typeof appointmentId !== "string" ||
    !appointmentId.trim()
  ) {
    throw new AppError(
      "Invalid appointment ID.",
      400,
    );
  }

  return appointmentId.trim();
}

function getOptionalStatus(
  req: Request,
):
  | "active"
  | "completed"
  | "expired"
  | "cancelled"
  | undefined {
  const value = req.query.status;

  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return undefined;
  }

  const result =
    servicePackageStatusUpdateSchema.safeParse({
      status: value.trim(),
    });

  if (!result.success) {
    throw new AppError(
      "Invalid service package status.",
      400,
    );
  }

  return result.data.status;
}

function getOptionalPositiveInteger(
  req: Request,
  field: "page" | "pageSize",
): number | undefined {
  const value = req.query[field];

  if (value === undefined) {
    return undefined;
  }

  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new AppError(
      `Invalid ${field}.`,
      400,
    );
  }

  const parsed = Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed < 1
  ) {
    throw new AppError(
      `${field} must be a positive whole number.`,
      400,
    );
  }

  return parsed;
}

function getOptionalClientId(
  req: Request,
): string | undefined {
  const value = req.query.clientId;

  if (value === undefined) {
    return undefined;
  }

  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new AppError(
      "Invalid client ID.",
      400,
    );
  }

  const result =
    servicePackageClientIdSchema.safeParse({
      clientId: value.trim(),
    });

  if (!result.success) {
    throw new AppError(
      "Invalid client ID.",
      400,
    );
  }

  return result.data.clientId;
}

function getOptionalServiceId(
  req: Request,
): string | undefined {
  const value = req.query.serviceId;

  if (value === undefined) {
    return undefined;
  }

  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new AppError(
      "Invalid service ID.",
      400,
    );
  }

  const result =
    servicePackageServiceIdSchema.safeParse({
      serviceId: value.trim(),
    });

  if (!result.success) {
    throw new AppError(
      "Invalid service ID.",
      400,
    );
  }

  return result.data.serviceId;
}

export async function getMyServicePackagesController(
  req: Request,
  res: Response,
): Promise<void> {
  const clientId = getClientId(req);
  const status = getOptionalStatus(req);

  const packages =
    await getMyServicePackages(
      clientId,
      status,
    );

  res.status(200).json({
    success: true,
    data: packages,
  });
}

export async function getMyServicePackageController(
  req: Request,
  res: Response,
): Promise<void> {
  const clientId = getClientId(req);
  const packageId =
    getServicePackageId(req);

  const packages =
    await getMyServicePackages(clientId);

  const servicePackage =
    packages.find(
      (item) =>
        String(item._id) ===
        packageId,
    );

  if (!servicePackage) {
    throw new AppError(
      "Service package was not found.",
      404,
    );
  }

  res.status(200).json({
    success: true,
    data: servicePackage,
  });
}

export async function getMyActiveServicePackageController(
  req: Request,
  res: Response,
): Promise<void> {
  const clientId = getClientId(req);
  const serviceId =
    getServiceId(req);

  const servicePackage =
    await getClientServicePackageForService(
      clientId,
      serviceId,
    );

  res.status(200).json({
    success: true,
    data: servicePackage,
  });
}

export async function checkUsableServicePackageController(
  req: Request,
  res: Response,
): Promise<void> {
  const clientId = getClientId(req);
  const serviceId =
    getServiceId(req);

  const usable =
    await hasUsableServicePackage(
      clientId,
      serviceId,
    );

  res.status(200).json({
    success: true,
    data: {
      usable,
    },
  });
}

export async function getServicePackageUsageController(
  req: Request,
  res: Response,
): Promise<void> {
  const clientId = getClientId(req);
  const packageId =
    getServicePackageId(req);

  const packages =
    await getMyServicePackages(clientId);

  const ownsPackage =
    packages.some(
      (item) =>
        String(item._id) ===
        packageId,
    );

  if (!ownsPackage) {
    throw new AppError(
      "Service package was not found.",
      404,
    );
  }

  const usage =
    await getServicePackageUsage(
      packageId,
    );

  res.status(200).json({
    success: true,
    data: usage,
  });
}

export async function getServicePackageForAppointmentController(
  req: Request,
  res: Response,
): Promise<void> {
  getClientId(req);

  const appointmentId =
    getAppointmentId(req);

  const servicePackage =
    await getServicePackageForAppointment(
      appointmentId,
    );

  res.status(200).json({
    success: true,
    data: servicePackage,
  });
}

export async function getAdminServicePackageController(
  req: Request,
  res: Response,
): Promise<void> {
  getClientId(req);

  const packageId =
    getServicePackageId(req);

  const servicePackage =
    await getServicePackageById(
      packageId,
    );

  res.status(200).json({
    success: true,
    data: servicePackage,
  });
}

export async function getAdminServicePackagesController(
  req: Request,
  res: Response,
): Promise<void> {
  getClientId(req);

  const page =
    getOptionalPositiveInteger(
      req,
      "page",
    );

  const pageSize =
    getOptionalPositiveInteger(
      req,
      "pageSize",
    );

  const status =
    getOptionalStatus(req);

  const clientId =
    getOptionalClientId(req);

  const serviceId =
    getOptionalServiceId(req);

  const result =
    await getAllServicePackages({
      page,
      pageSize,
      status,
      clientId,
      serviceId,
    });

  res.status(200).json({
    success: true,
    data: result,
  });
}