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

const pricingOptionCodeSchema =
  z.enum([
    "early_bird",
    "standard",
    "one_on_one",
  ]);

const programmeEnrollmentStatusSchema =
  z.enum([
    "active",
    "completed",
    "cancelled",
    "refunded",
  ]);

const currencySchema =
  z.enum([
    "NGN",
    "USD",
    "GBP",
  ]);

const groupParticipantCountSchema =
  z
    .number()
    .int()
    .min(
      2,
      "Group participant count must be at least 2.",
    );

const discountPercentSchema =
  z
    .number()
    .finite(
      "Discount percentage must be a valid number.",
    )
    .min(
      0,
      "Discount percentage cannot be negative.",
    )
    .max(
      100,
      "Discount percentage cannot exceed 100 percent.",
    );

export const createProgrammeEnrollmentSchema =
  z
    .object({
      clientId:
        objectIdSchema,

      programmeId:
        objectIdSchema,

      paymentId:
        objectIdSchema,

      pricingOptionCode:
        pricingOptionCodeSchema,

      amountPaid:
        z
          .number()
          .finite(
            "Amount paid must be a valid number.",
          )
          .positive(
            "Amount paid must be greater than zero.",
          ),

      currency:
        currencySchema,

      groupParticipantCount:
        groupParticipantCountSchema
          .optional(),

      discountPercent:
        discountPercentSchema
          .optional(),

      status:
        programmeEnrollmentStatusSchema
          .optional(),

      enrolledAt:
        z.coerce.date({
          message:
            "A valid enrollment date is required.",
        }),

      completedAt:
        z.coerce
          .date({
            message:
              "A valid completion date is required.",
          })
          .optional(),

      cancelledAt:
        z.coerce
          .date({
            message:
              "A valid cancellation date is required.",
          })
          .optional(),

      refundedAt:
        z.coerce
          .date({
            message:
              "A valid refund date is required.",
          })
          .optional(),
    })
    .strict()
    .superRefine(
      (data, context) => {
        if (
          data.pricingOptionCode ===
            "one_on_one" &&
          data.groupParticipantCount !==
            undefined
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,
            path: [
              "groupParticipantCount",
            ],
            message:
              "One-on-one pricing cannot have a group participant count.",
          });
        }

        if (
          data.status ===
            "completed" &&
          !data.completedAt
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,
            path: [
              "completedAt",
            ],
            message:
              "Completed enrollment requires completedAt.",
          });
        }

        if (
          data.status ===
            "cancelled" &&
          !data.cancelledAt
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,
            path: [
              "cancelledAt",
            ],
            message:
              "Cancelled enrollment requires cancelledAt.",
          });
        }

        if (
          data.status ===
            "refunded" &&
          !data.refundedAt
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,
            path: [
              "refundedAt",
            ],
            message:
              "Refunded enrollment requires refundedAt.",
          });
        }

        if (
          data.completedAt &&
          data.completedAt <
            data.enrolledAt
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,
            path: [
              "completedAt",
            ],
            message:
              "Completion date cannot be before the enrollment date.",
          });
        }

        if (
          data.cancelledAt &&
          data.cancelledAt <
            data.enrolledAt
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,
            path: [
              "cancelledAt",
            ],
            message:
              "Cancellation date cannot be before the enrollment date.",
          });
        }

        if (
          data.refundedAt &&
          data.refundedAt <
            data.enrolledAt
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,
            path: [
              "refundedAt",
            ],
            message:
              "Refund date cannot be before the enrollment date.",
          });
        }
      },
    );

export const updateProgrammeEnrollmentSchema =
  z
    .object({
      pricingOptionCode:
        pricingOptionCodeSchema
          .optional(),

      amountPaid:
        z
          .number()
          .finite(
            "Amount paid must be a valid number.",
          )
          .positive(
            "Amount paid must be greater than zero.",
          )
          .optional(),

      currency:
        currencySchema.optional(),

      groupParticipantCount:
        groupParticipantCountSchema
          .optional(),

      discountPercent:
        discountPercentSchema
          .optional(),

      status:
        programmeEnrollmentStatusSchema
          .optional(),

      completedAt:
        z.coerce
          .date({
            message:
              "A valid completion date is required.",
          })
          .optional(),

      cancelledAt:
        z.coerce
          .date({
            message:
              "A valid cancellation date is required.",
          })
          .optional(),

      refundedAt:
        z.coerce
          .date({
            message:
              "A valid refund date is required.",
          })
          .optional(),
    })
    .strict();

export const programmeEnrollmentRequestSchema =
  z
    .object({
      programmeId:
        objectIdSchema,

      pricingOptionCode:
        pricingOptionCodeSchema,

      groupParticipantCount:
        groupParticipantCountSchema
          .optional(),
    })
    .strict()
    .superRefine(
      (data, context) => {
        if (
          data.pricingOptionCode ===
            "one_on_one" &&
          data.groupParticipantCount !==
            undefined
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,
            path: [
              "groupParticipantCount",
            ],
            message:
              "One-on-one pricing cannot have a group participant count.",
          });
        }
      },
    );

export const programmeEnrollmentIdSchema =
  z
    .object({
      id:
        objectIdSchema,
    })
    .strict();

export const programmeEnrollmentProgrammeIdSchema =
  z
    .object({
      programmeId:
        objectIdSchema,
    })
    .strict();

export const programmeEnrollmentClientIdSchema =
  z
    .object({
      clientId:
        objectIdSchema,
    })
    .strict();

export const programmeEnrollmentPaymentIdSchema =
  z
    .object({
      paymentId:
        objectIdSchema,
    })
    .strict();

export const programmeEnrollmentStatusUpdateSchema =
  z
    .object({
      status:
        programmeEnrollmentStatusSchema,
    })
    .strict();

export type ProgrammeEnrollmentStatus =
  z.infer<
    typeof programmeEnrollmentStatusSchema
  >;

export type ProgrammeEnrollmentPricingOptionCode =
  z.infer<
    typeof pricingOptionCodeSchema
  >;

export type ProgrammeEnrollmentCurrency =
  z.infer<
    typeof currencySchema
  >;