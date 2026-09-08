import mongoose from "mongoose";

import {
  AuditLog,
  type AuditAction,
  type AuditResource,
} from "../models/AuditLog.js";
import { AppError } from "../utils/appError.js";

type AuditChange = {
  before?: unknown;
  after?: unknown;
};

type CreateAuditLogInput = {
  actorId: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  description: string;
  changes?: Record<
    string,
    AuditChange
  >;
  metadata?: Record<
    string,
    unknown
  >;
  ipAddress?: string;
  userAgent?: string;
};

const AUDIT_ACTIONS: AuditAction[] = [
  "create",
  "update",
  "delete",
  "archive",
  "restore",
  "activate",
  "deactivate",
  "approve",
  "reject",
  "cancel",
  "complete",
  "login",
  "logout",
  "status_change",
];

const AUDIT_RESOURCES: AuditResource[] = [
  "user",
  "client",
  "appointment",
  "service",
  "availability",
  "availability_exception",
  "intake_form",
  "notification",
  "workshop",
  "workshop_request",
  "workshop_participant",
  "testimonial",
  "resource",
  "faq",
  "contact_message",
  "website_content",
  "media_asset",
];

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

function validateAction(
  action: AuditAction,
) {
  if (
    !AUDIT_ACTIONS.includes(
      action,
    )
  ) {
    throw new AppError(
      "Invalid audit action.",
      400,
    );
  }
}

function validateResource(
  resource: AuditResource,
) {
  if (
    !AUDIT_RESOURCES.includes(
      resource,
    )
  ) {
    throw new AppError(
      "Invalid audit resource.",
      400,
    );
  }
}

async function getAuditLogOrFail(
  auditLogId: string,
) {
  validateObjectId(
    auditLogId,
    "audit log ID",
  );

  const auditLog =
    await AuditLog.findById(
      auditLogId,
    ).populate(
      "actorId",
      "email role",
    );

  if (!auditLog) {
    throw new AppError(
      "Audit log not found.",
      404,
    );
  }

  return auditLog;
}

export async function createAuditLog(
  data: CreateAuditLogInput,
) {
  validateObjectId(
    data.actorId,
    "actor ID",
  );

  validateAction(
    data.action,
  );

  validateResource(
    data.resource,
  );

  if (
    data.resourceId !==
    undefined
  ) {
    validateObjectId(
      data.resourceId,
      "resource ID",
    );
  }

  return AuditLog.create({
    actorId:
      data.actorId,

    action:
      data.action,

    resource:
      data.resource,

    resourceId:
      data.resourceId,

    description:
      data.description,

    changes:
      data.changes,

    metadata:
      data.metadata,

    ipAddress:
      data.ipAddress,

    userAgent:
      data.userAgent,
  });
}

export async function getAllAuditLogs() {
  return AuditLog.find()
    .populate(
      "actorId",
      "email role",
    )
    .sort({
      createdAt: -1,
    });
}

export async function getAuditLogById(
  auditLogId: string,
) {
  return getAuditLogOrFail(
    auditLogId,
  );
}

export async function getAuditLogsByAction(
  action: AuditAction,
) {
  validateAction(action);

  return AuditLog.find({
    action,
  })
    .populate(
      "actorId",
      "email role",
    )
    .sort({
      createdAt: -1,
    });
}

export async function getAuditLogsByResource(
  resource: AuditResource,
) {
  validateResource(resource);

  return AuditLog.find({
    resource,
  })
    .populate(
      "actorId",
      "email role",
    )
    .sort({
      createdAt: -1,
    });
}

export async function getAuditLogsByActor(
  actorId: string,
) {
  validateObjectId(
    actorId,
    "actor ID",
  );

  return AuditLog.find({
    actorId,
  })
    .populate(
      "actorId",
      "email role",
    )
    .sort({
      createdAt: -1,
    });
}

export async function getAuditLogsByResourceId(
  resourceId: string,
) {
  validateObjectId(
    resourceId,
    "resource ID",
  );

  return AuditLog.find({
    resourceId,
  })
    .populate(
      "actorId",
      "email role",
    )
    .sort({
      createdAt: -1,
    });
}

export async function deleteAuditLog(
  auditLogId: string,
) {
  const auditLog =
    await getAuditLogOrFail(
      auditLogId,
    );

  await auditLog.deleteOne();

  return {
    deleted: true,
    auditLogId,
  };
}