import type { Request, Response } from "express";

import {
  deleteAuditLog,
  getAllAuditLogs,
  getAuditLogById,
  getAuditLogsByAction,
  getAuditLogsByActor,
  getAuditLogsByResource,
  getAuditLogsByResourceId,
} from "../services/auditLogService.js";

function getAuditLogId(
  req: Request,
) {
  const { id } = req.params;

  if (
    typeof id !== "string" ||
    !id.trim()
  ) {
    throw new Error(
      "Audit log ID is required.",
    );
  }

  return id;
}

export async function getAll(
  _req: Request,
  res: Response,
) {
  const auditLogs =
    await getAllAuditLogs();

  res.status(200).json({
    success: true,
    data: auditLogs,
  });
}

export async function getOne(
  req: Request,
  res: Response,
) {
  const auditLogId =
    getAuditLogId(req);

  const auditLog =
    await getAuditLogById(
      auditLogId,
    );

  res.status(200).json({
    success: true,
    data: auditLog,
  });
}

export async function getByAction(
  req: Request,
  res: Response,
) {
  const { action } =
    req.params;

  if (
    typeof action !== "string" ||
    !action.trim()
  ) {
    throw new Error(
      "Audit action is required.",
    );
  }

  const auditLogs =
    await getAuditLogsByAction(
      action as
        | "create"
        | "update"
        | "delete"
        | "archive"
        | "restore"
        | "activate"
        | "deactivate"
        | "approve"
        | "reject"
        | "cancel"
        | "complete"
        | "login"
        | "logout"
        | "status_change",
    );

  res.status(200).json({
    success: true,
    data: auditLogs,
  });
}

export async function getByResource(
  req: Request,
  res: Response,
) {
  const { resource } =
    req.params;

  if (
    typeof resource !== "string" ||
    !resource.trim()
  ) {
    throw new Error(
      "Audit resource is required.",
    );
  }

  const auditLogs =
    await getAuditLogsByResource(
      resource as
        | "user"
        | "client"
        | "appointment"
        | "service"
        | "availability"
        | "availability_exception"
        | "intake_form"
        | "notification"
        | "workshop"
        | "workshop_request"
        | "workshop_participant"
        | "testimonial"
        | "resource"
        | "faq"
        | "contact_message"
        | "website_content"
        | "media_asset",
    );

  res.status(200).json({
    success: true,
    data: auditLogs,
  });
}

export async function getByActor(
  req: Request,
  res: Response,
) {
  const { actorId } =
    req.params;

  if (
    typeof actorId !== "string" ||
    !actorId.trim()
  ) {
    throw new Error(
      "Actor ID is required.",
    );
  }

  const auditLogs =
    await getAuditLogsByActor(
      actorId,
    );

  res.status(200).json({
    success: true,
    data: auditLogs,
  });
}

export async function getByResourceId(
  req: Request,
  res: Response,
) {
  const { resourceId } =
    req.params;

  if (
    typeof resourceId !== "string" ||
    !resourceId.trim()
  ) {
    throw new Error(
      "Resource ID is required.",
    );
  }

  const auditLogs =
    await getAuditLogsByResourceId(
      resourceId,
    );

  res.status(200).json({
    success: true,
    data: auditLogs,
  });
}

export async function remove(
  req: Request,
  res: Response,
) {
  const auditLogId =
    getAuditLogId(req);

  const result =
    await deleteAuditLog(
      auditLogId,
    );

  res.status(200).json({
    success: true,
    message:
      "Audit log deleted successfully.",
    data: result,
  });
}