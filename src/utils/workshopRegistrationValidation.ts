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

const emailSchema =
  z
    .string()
    .trim()
    .email(
      "A valid email address is required.",
    )
    .max(
      320,
      "Email address must not exceed 320 characters.",
    );

const phoneSchema =
  z
    .string()
    .trim()
    .min(
      7,
      "Phone number is invalid.",
    )
    .max(
      50,
      "Phone number must not exceed 50 characters.",
    )
    .optional();

const ticketCodeSchema =
  z
    .string()
    .trim()
    .min(
      1,
      "Ticket code is required.",
    )
    .max(
      100,
      "Ticket code must not exceed 100 characters.",
    )
    .regex(
      /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/,
      "Ticket code must contain only lowercase letters, numbers, underscores, and hyphens.",
    );

const ticketNameSchema =
  z
    .string()
    .trim()
    .min(
      1,
      "Ticket name is required.",
    )
    .max(
      150,
      "Ticket name must not exceed 150 characters.",
    );

const attendeeCountSchema =
  z
    .number()
    .int()
    .min(
      1,
      "Attendee count must be at least 1.",
    );

const registrationStatusSchema =
  z.enum([
    "registered",
    "attended",
    "cancelled",
    "refunded",
  ]);

const currencySchema =
  z.enum([
    "NGN",
    "USD",
  ]);

const amountPaidSchema =
  z
    .number()
    .finite(
      "Amount paid must be a valid number.",
    )
    .positive(
      "Amount paid must be greater than zero.",
    );

const optionalTrimmedString = (
  maxLength: number,
) =>
  z
    .string()
    .trim()
    .max(
      maxLength,
    )
    .optional();

/*
 * Client registration request
 *
 * These are the only fields the client
 * should submit when registering for a
 * workshop.
 *
 * Payment and historical registration
 * fields are created by the backend.
 */

export const workshopRegistrationRequestSchema =
  z
    .object({
      workshopId:
        objectIdSchema,

      ticketCode:
        ticketCodeSchema,

      attendeeCount:
        attendeeCountSchema,

      fullName:
        z
          .string()
          .trim()
          .min(
            1,
            "Full name is required.",
          )
          .max(
            200,
            "Full name must not exceed 200 characters.",
          ),

      email:
        emailSchema,

      phone:
        phoneSchema,

      organisationName:
        optionalTrimmedString(
          200,
        ),
    })
    .strict();

/*
 * Backend registration creation
 *
 * Used when the backend creates a
 * WorkshopRegistration after successful
 * payment.
 */

export const createWorkshopRegistrationSchema =
  z
    .object({
      clientId:
        objectIdSchema.optional(),

      workshopId:
        objectIdSchema,

      paymentId:
        objectIdSchema,

      ticketCode:
        ticketCodeSchema,

      ticketName:
        ticketNameSchema,

      attendeeCount:
        attendeeCountSchema,

      amountPaid:
        amountPaidSchema,

      currency:
        currencySchema,

      fullName:
        z
          .string()
          .trim()
          .min(
            1,
            "Full name is required.",
          )
          .max(
            200,
            "Full name must not exceed 200 characters.",
          ),

      email:
        emailSchema,

      phone:
        phoneSchema,

      organisationName:
        optionalTrimmedString(
          200,
        ),

      status:
        registrationStatusSchema
          .optional(),

      registeredAt:
        z.coerce.date({
          message:
            "A valid registration date is required.",
        }),

      attendedAt:
        z.coerce
          .date({
            message:
              "A valid attendance date is required.",
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
      (
        data,
        context,
      ) => {
        if (
          data.status ===
            "attended" &&
          !data.attendedAt
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,
            path: [
              "attendedAt",
            ],
            message:
              "Attended registration requires attendedAt.",
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
              "Cancelled registration requires cancelledAt.",
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
              "Refunded registration requires refundedAt.",
          });
        }

        if (
          data.attendedAt &&
          data.attendedAt <
            data.registeredAt
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,
            path: [
              "attendedAt",
            ],
            message:
              "Attendance date cannot be before the registration date.",
          });
        }

        if (
          data.cancelledAt &&
          data.cancelledAt <
            data.registeredAt
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,
            path: [
              "cancelledAt",
            ],
            message:
              "Cancellation date cannot be before the registration date.",
          });
        }

        if (
          data.refundedAt &&
          data.refundedAt <
            data.registeredAt
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,
            path: [
              "refundedAt",
            ],
            message:
              "Refund date cannot be before the registration date.",
          });
        }

        if (
          data.status ===
            "registered" &&
          (
            data.attendedAt ||
            data.cancelledAt ||
            data.refundedAt
          )
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,
            path: [
              "status",
            ],
            message:
              "A registered workshop registration cannot have attendance, cancellation, or refund dates.",
          });
        }

        if (
          data.status ===
            "attended" &&
          (
            data.cancelledAt ||
            data.refundedAt
          )
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,
            path: [
              "status",
            ],
            message:
              "An attended workshop registration cannot have cancellation or refund dates.",
          });
        }

        if (
          data.status ===
            "cancelled" &&
          (
            data.attendedAt ||
            data.refundedAt
          )
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,
            path: [
              "status",
            ],
            message:
              "A cancelled workshop registration cannot have attendance or refund dates.",
          });
        }

        if (
          data.status ===
            "refunded" &&
          (
            data.attendedAt ||
            data.cancelledAt
          )
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,
            path: [
              "status",
            ],
            message:
              "A refunded workshop registration cannot have attendance or cancellation dates.",
          });
        }
      },
    );

/*
 * Registration update
 *
 * Used by administrative workflows.
 */

export const updateWorkshopRegistrationSchema =
  z
    .object({
      ticketCode:
        ticketCodeSchema
          .optional(),

      ticketName:
        ticketNameSchema
          .optional(),

      attendeeCount:
        attendeeCountSchema
          .optional(),

      fullName:
        z
          .string()
          .trim()
          .min(
            1,
            "Full name is required.",
          )
          .max(
            200,
            "Full name must not exceed 200 characters.",
          )
          .optional(),

      email:
        emailSchema.optional(),

      phone:
        phoneSchema,

      organisationName:
        optionalTrimmedString(
          200,
        ),

      status:
        registrationStatusSchema
          .optional(),

      attendedAt:
        z.coerce
          .date({
            message:
              "A valid attendance date is required.",
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
      (
        data,
        context,
      ) => {
        if (
          data.status ===
            "attended" &&
          !data.attendedAt
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,
            path: [
              "attendedAt",
            ],
            message:
              "Attended registration requires attendedAt.",
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
              "Cancelled registration requires cancelledAt.",
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
              "Refunded registration requires refundedAt.",
          });
        }

        if (
          data.attendedAt &&
          data.cancelledAt
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,
            path: [
              "attendedAt",
            ],
            message:
              "A registration cannot have both attendance and cancellation dates.",
          });
        }

        if (
          data.attendedAt &&
          data.refundedAt
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,
            path: [
              "attendedAt",
            ],
            message:
              "A registration cannot have both attendance and refund dates.",
          });
        }

        if (
          data.cancelledAt &&
          data.refundedAt
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,
            path: [
              "cancelledAt",
            ],
            message:
              "A registration cannot have both cancellation and refund dates.",
          });
        }
      },
    );

/*
 * IDs
 */

export const workshopRegistrationIdSchema =
  z
    .object({
      id:
        objectIdSchema,
    })
    .strict();

export const workshopRegistrationWorkshopIdSchema =
  z
    .object({
      workshopId:
        objectIdSchema,
    })
    .strict();

export const workshopRegistrationClientIdSchema =
  z
    .object({
      clientId:
        objectIdSchema,
    })
    .strict();

export const workshopRegistrationPaymentIdSchema =
  z
    .object({
      paymentId:
        objectIdSchema,
    })
    .strict();

/*
 * Status
 */

export const workshopRegistrationStatusUpdateSchema =
  z
    .object({
      status:
        registrationStatusSchema,
    })
    .strict();

/*
 * Types
 */

export type WorkshopRegistrationStatus =
  z.infer<
    typeof registrationStatusSchema
  >;

export type WorkshopRegistrationCurrency =
  z.infer<
    typeof currencySchema
  >;