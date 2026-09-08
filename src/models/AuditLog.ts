import mongoose, {
  Document,
  Schema,
} from "mongoose";

export type AuditAction =
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
  | "status_change";

export type AuditResource =
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
  | "media_asset";

export interface IAuditLog
  extends Document {
  actorId: mongoose.Types.ObjectId;

  action: AuditAction;

  resource: AuditResource;

  resourceId?: mongoose.Types.ObjectId;

  description: string;

  changes?: Record<
    string,
    {
      before?: unknown;
      after?: unknown;
    }
  >;

  metadata?: Record<
    string,
    unknown
  >;

  ipAddress?: string;

  userAgent?: string;

  createdAt: Date;
}

const auditLogSchema =
  new Schema<IAuditLog>(
    {
      actorId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: [
          true,
          "Actor is required.",
        ],
        index: true,
      },

      action: {
        type: String,
        enum: [
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
        ],
        required: [
          true,
          "Audit action is required.",
        ],
        index: true,
      },

      resource: {
        type: String,
        enum: [
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
        ],
        required: [
          true,
          "Audit resource is required.",
        ],
        index: true,
      },

      resourceId: {
        type: Schema.Types.ObjectId,
        index: true,
      },

      description: {
        type: String,
        required: [
          true,
          "Audit description is required.",
        ],
        trim: true,
        maxlength: 1000,
      },

      changes: {
        type: Schema.Types.Mixed,
      },

      metadata: {
        type: Schema.Types.Mixed,
      },

      ipAddress: {
        type: String,
        trim: true,
        maxlength: 100,
      },

      userAgent: {
        type: String,
        trim: true,
        maxlength: 1000,
      },
    },
    {
      timestamps: {
        createdAt: true,
        updatedAt: false,
      },
    },
  );

auditLogSchema.index({
  createdAt: -1,
});

auditLogSchema.index({
  actorId: 1,
  createdAt: -1,
});

auditLogSchema.index({
  resource: 1,
  resourceId: 1,
  createdAt: -1,
});

auditLogSchema.index({
  action: 1,
  createdAt: -1,
});

export const AuditLog =
  mongoose.model<IAuditLog>(
    "AuditLog",
    auditLogSchema,
  );