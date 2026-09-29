import mongoose from "mongoose";
import { z } from "zod";

const objectIdRegex =
  /^[a-fA-F0-9]{24}$/;

const objectIdSchema =
  z
    .string()
    .trim()
    .regex(
      objectIdRegex,
      "Invalid ID.",
    )
    .refine(
      (value) =>
        mongoose.Types.ObjectId.isValid(
          value,
        ),
      "Invalid ID.",
    );

const servicePackageStatusSchema =
  z.enum([
    "active",
    "completed",
    "expired",
    "cancelled",
  ]);

const sessionCountSchema =
  z
    .number()
    .int()
    .min(
      0,
      "Session count cannot be negative.",
    );

export const createServicePackageSchema =
  z
    .object({
      clientId:
        objectIdSchema,

      serviceId:
        objectIdSchema,

      paymentId:
        objectIdSchema,

      totalSessions:
        z
          .number()
          .int()
          .min(
            1,
            "Total sessions must be at least 1.",
          ),

      usedSessions:
        sessionCountSchema
          .optional(),

      remainingSessions:
        sessionCountSchema
          .optional(),

      status:
        servicePackageStatusSchema
          .optional(),

      purchasedAt:
        z.coerce.date({
          message:
            "A valid purchase date is required.",
        }),

      expiresAt:
        z.coerce
          .date({
            message:
              "A valid expiry date is required.",
          })
          .optional(),

      lastUsedAt:
        z.coerce
          .date({
            message:
              "A valid last-used date is required.",
          })
          .optional(),
    })
    .strict()
    .superRefine(
      (data, context) => {
        const usedSessions =
          data.usedSessions ?? 0;

        const remainingSessions =
          data.remainingSessions ??
          data.totalSessions -
            usedSessions;

        if (
          usedSessions >
          data.totalSessions
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,
            path: [
              "usedSessions",
            ],
            message:
              "Used sessions cannot exceed total sessions.",
          });
        }

        if (
          remainingSessions !==
          data.totalSessions -
            usedSessions
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,
            path: [
              "remainingSessions",
            ],
            message:
              "Remaining sessions must equal total sessions minus used sessions.",
          });
        }

        if (
          data.expiresAt &&
          data.expiresAt <=
            data.purchasedAt
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,
            path: [
              "expiresAt",
            ],
            message:
              "Expiry date must be after the purchase date.",
          });
        }

        if (
          data.lastUsedAt &&
          data.lastUsedAt <
            data.purchasedAt
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,
            path: [
              "lastUsedAt",
            ],
            message:
              "Last-used date cannot be before the purchase date.",
          });
        }

        if (
          remainingSessions === 0 &&
          data.status === "active"
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,
            path: [
              "status",
            ],
            message:
              "A package with no remaining sessions cannot be active.",
          });
        }

        if (
          remainingSessions > 0 &&
          data.status === "completed"
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,
            path: [
              "status",
            ],
            message:
              "A package with remaining sessions cannot be completed.",
          });
        }
      },
    );

export const updateServicePackageSchema =
  z
    .object({
      totalSessions:
        z
          .number()
          .int()
          .min(
            1,
            "Total sessions must be at least 1.",
          )
          .optional(),

      usedSessions:
        sessionCountSchema
          .optional(),

      remainingSessions:
        sessionCountSchema
          .optional(),

      status:
        servicePackageStatusSchema
          .optional(),

      expiresAt:
        z.coerce
          .date({
            message:
              "A valid expiry date is required.",
          })
          .optional(),

      lastUsedAt:
        z.coerce
          .date({
            message:
              "A valid last-used date is required.",
          })
          .optional(),
    })
    .strict()
    .superRefine(
      (data, context) => {
        if (
          data.usedSessions !==
            undefined &&
          data.remainingSessions !==
            undefined &&
          data.totalSessions !==
            undefined &&
          data.usedSessions >
            data.totalSessions
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,
            path: [
              "usedSessions",
            ],
            message:
              "Used sessions cannot exceed total sessions.",
          });
        }

        if (
          data.usedSessions !==
            undefined &&
          data.remainingSessions !==
            undefined &&
          data.totalSessions !==
            undefined &&
          data.remainingSessions !==
            data.totalSessions -
              data.usedSessions
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,
            path: [
              "remainingSessions",
            ],
            message:
              "Remaining sessions must equal total sessions minus used sessions.",
          });
        }
      },
    );

export const servicePackageIdSchema =
  z
    .object({
      id:
        objectIdSchema,
    })
    .strict();

export const servicePackageClientIdSchema =
  z
    .object({
      clientId:
        objectIdSchema,
    })
    .strict();

export const servicePackageServiceIdSchema =
  z
    .object({
      serviceId:
        objectIdSchema,
    })
    .strict();

export const servicePackagePaymentIdSchema =
  z
    .object({
      paymentId:
        objectIdSchema,
    })
    .strict();

export const servicePackageStatusUpdateSchema =
  z
    .object({
      status:
        servicePackageStatusSchema,
    })
    .strict();

export type ServicePackageStatus =
  z.infer<
    typeof servicePackageStatusSchema
  >;