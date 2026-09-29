import type { Request, Response } from "express";

import {
  cancelWorkshopRegistration,
  countWorkshopAttendees,
  countWorkshopRegistrations,
  getAllWorkshopRegistrations,
  getMyWorkshopRegistration,
  getMyWorkshopRegistrations,
  getWorkshopRegistrationByClientAndPayment,
  getWorkshopRegistrationById,
  getWorkshopRegistrationByPaymentId,
  getWorkshopRegistrationsByTicket,
  getWorkshopRegistrationsForWorkshop,
  hasWorkshopRegistration,
  markWorkshopRegistrationAttended,
  refundWorkshopRegistration,
} from "../services/workshopRegistrationService.js";
import {
  workshopRegistrationClientIdSchema,
  workshopRegistrationIdSchema,
  workshopRegistrationPaymentIdSchema,
  workshopRegistrationStatusUpdateSchema,
  workshopRegistrationWorkshopIdSchema,
} from "../utils/workshopRegistrationValidation.js";
import { AppError } from "../utils/appError.js";

function getUserId(req: Request): string {
  const userId = req.user?.userId;

  if (typeof userId !== "string" || !userId.trim()) {
    throw new AppError(
      "Authenticated user is required.",
      401,
    );
  }

  return userId.trim();
}

function getRegistrationId(req: Request): string {
  const result =
    workshopRegistrationIdSchema.safeParse({
      id: req.params.id,
    });

  if (!result.success) {
    throw new AppError(
      "Invalid workshop registration ID.",
      400,
    );
  }

  return result.data.id;
}

function getWorkshopId(req: Request): string {
  const value =
    req.params.workshopId ??
    req.query.workshopId;

  const result =
    workshopRegistrationWorkshopIdSchema.safeParse({
      workshopId: value,
    });

  if (!result.success) {
    throw new AppError(
      "Invalid workshop ID.",
      400,
    );
  }

  return result.data.workshopId;
}

function getPaymentId(req: Request): string {
  const value =
    req.params.paymentId ??
    req.query.paymentId;

  const result =
    workshopRegistrationPaymentIdSchema.safeParse({
      paymentId: value,
    });

  if (!result.success) {
    throw new AppError(
      "Invalid payment ID.",
      400,
    );
  }

  return result.data.paymentId;
}

function getOptionalStatus(
  req: Request,
) {
  const value = req.query.status;

  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return undefined;
  }

  const result =
    workshopRegistrationStatusUpdateSchema.safeParse({
      status: value.trim(),
    });

  if (!result.success) {
    throw new AppError(
      "Invalid workshop registration status.",
      400,
    );
  }

  return result.data.status;
}

function getOptionalClientId(
  req: Request,
): string | undefined {
  const value = req.query.clientId;

  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return undefined;
  }

  const result =
    workshopRegistrationClientIdSchema.safeParse({
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

function getOptionalWorkshopId(
  req: Request,
): string | undefined {
  const value = req.query.workshopId;

  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return undefined;
  }

  const result =
    workshopRegistrationWorkshopIdSchema.safeParse({
      workshopId: value.trim(),
    });

  if (!result.success) {
    throw new AppError(
      "Invalid workshop ID.",
      400,
    );
  }

  return result.data.workshopId;
}

function getOptionalTicketCode(
  req: Request,
): string | undefined {
  const value = req.query.ticketCode;

  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return undefined;
  }

  const ticketCode = value.trim();

  if (
    ticketCode.length > 100 ||
    !/^[a-z0-9]+(?:[_-][a-z0-9]+)*$/.test(
      ticketCode,
    )
  ) {
    throw new AppError(
      "Invalid ticket code.",
      400,
    );
  }

  return ticketCode;
}

function getOptionalPositiveInteger(
  req: Request,
  field: "page" | "pageSize",
): number | undefined {
  const value = req.query[field];

  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return undefined;
  }

  const parsed = Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed < 1
  ) {
    throw new AppError(
      `${field} must be a positive integer.`,
      400,
    );
  }

  return parsed;
}

export async function getMyWorkshopRegistrationsController(
  req: Request,
  res: Response,
) {
  const userId = getUserId(req);
  const status = getOptionalStatus(req);

  const registrations =
    await getMyWorkshopRegistrations(
      userId,
      status,
    );

  res.status(200).json({
    success: true,
    data: registrations,
  });
}

export async function getMyWorkshopRegistrationController(
  req: Request,
  res: Response,
) {
  const userId = getUserId(req);
  const workshopId = getWorkshopId(req);

  const registration =
    await getMyWorkshopRegistration(
      userId,
      workshopId,
    );

  res.status(200).json({
    success: true,
    data: registration,
  });
}

export async function checkWorkshopRegistrationController(
  req: Request,
  res: Response,
) {
  const userId = getUserId(req);
  const workshopId = getWorkshopId(req);

  const hasRegistration =
    await hasWorkshopRegistration(
      userId,
      workshopId,
    );

  res.status(200).json({
    success: true,
    data: {
      hasRegistration,
    },
  });
}

export async function getMyWorkshopRegistrationByPaymentController(
  req: Request,
  res: Response,
) {
  const userId = getUserId(req);
  const paymentId = getPaymentId(req);

  const registration =
    await getWorkshopRegistrationByClientAndPayment(
      userId,
      paymentId,
    );

  res.status(200).json({
    success: true,
    data: registration,
  });
}

export async function getWorkshopRegistrationByPaymentController(
  req: Request,
  res: Response,
) {
  const paymentId = getPaymentId(req);

  const registration =
    await getWorkshopRegistrationByPaymentId(
      paymentId,
    );

  res.status(200).json({
    success: true,
    data: registration,
  });
}

export async function getAdminWorkshopRegistrationController(
  req: Request,
  res: Response,
) {
  const registrationId =
    getRegistrationId(req);

  const registration =
    await getWorkshopRegistrationById(
      registrationId,
    );

  res.status(200).json({
    success: true,
    data: registration,
  });
}

export async function getAdminWorkshopRegistrationsController(
  req: Request,
  res: Response,
) {
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

  const status = getOptionalStatus(req);
  const clientId =
    getOptionalClientId(req);
  const workshopId =
    getOptionalWorkshopId(req);
  const ticketCode =
    getOptionalTicketCode(req);

  const result =
    await getAllWorkshopRegistrations({
      page,
      pageSize,
      status,
      clientId,
      workshopId,
      ticketCode,
    });

  res.status(200).json({
    success: true,
    data: result.registrations,
    pagination: {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      totalPages: result.totalPages,
    },
  });
}

export async function getWorkshopRegistrationsForWorkshopController(
  req: Request,
  res: Response,
) {
  const workshopId = getWorkshopId(req);
  const status = getOptionalStatus(req);

  const registrations =
    await getWorkshopRegistrationsForWorkshop(
      workshopId,
      status,
    );

  res.status(200).json({
    success: true,
    data: registrations,
  });
}

export async function getWorkshopRegistrationsByTicketController(
  req: Request,
  res: Response,
) {
  const workshopId = getWorkshopId(req);
  const ticketCode =
    getOptionalTicketCode(req);

  if (!ticketCode) {
    throw new AppError(
      "Ticket code is required.",
      400,
    );
  }

  const registrations =
    await getWorkshopRegistrationsByTicket(
      workshopId,
      ticketCode,
    );

  res.status(200).json({
    success: true,
    data: registrations,
  });
}

export async function countWorkshopRegistrationsController(
  req: Request,
  res: Response,
) {
  const workshopId = getWorkshopId(req);

  const count =
    await countWorkshopRegistrations(
      workshopId,
    );

  res.status(200).json({
    success: true,
    data: {
      count,
    },
  });
}

export async function countWorkshopAttendeesController(
  req: Request,
  res: Response,
) {
  const workshopId = getWorkshopId(req);

  const count =
    await countWorkshopAttendees(
      workshopId,
    );

  res.status(200).json({
    success: true,
    data: {
      count,
    },
  });
}

export async function markWorkshopRegistrationAttendedController(
  req: Request,
  res: Response,
) {
  const registrationId =
    getRegistrationId(req);

  const registration =
    await markWorkshopRegistrationAttended(
      registrationId,
    );

  res.status(200).json({
    success: true,
    data: registration,
  });
}

export async function cancelWorkshopRegistrationController(
  req: Request,
  res: Response,
) {
  const registrationId =
    getRegistrationId(req);

  const registration =
    await cancelWorkshopRegistration(
      registrationId,
    );

  res.status(200).json({
    success: true,
    data: registration,
  });
}

export async function refundWorkshopRegistrationController(
  req: Request,
  res: Response,
) {
  const registrationId =
    getRegistrationId(req);

  const registration =
    await refundWorkshopRegistration(
      registrationId,
    );

  res.status(200).json({
    success: true,
    data: registration,
  });
}