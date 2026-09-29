import mongoose from "mongoose";
import { z } from "zod";

const objectIdRegex =
  /^[a-fA-F0-9]{24}$/;

const transactionReferenceRegex =
  /^[A-Za-z0-9_-]{8,200}$/;

const objectIdSchema = z
  .string()
  .trim()
  .regex(
    objectIdRegex,
    "Invalid ID.",
  )
  .refine(
    (value) =>
      mongoose.Types.ObjectId.isValid(value),
    "Invalid ID.",
  );

const transactionReferenceSchema = z
  .string()
  .trim()
  .min(
    8,
    "Transaction reference is invalid.",
  )
  .max(
    200,
    "Transaction reference is invalid.",
  )
  .regex(
    transactionReferenceRegex,
    "Transaction reference is invalid.",
  );

const paymentCurrencySchema = z.enum([
  "USD",
  "NGN",
  "GBP",
]);

const paymentProductTypeSchema = z.enum([
  "service",
  "programme",
  "workshop",
]);

const paymentMetadataValueSchema =
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
  ]);

const paymentMetadataSchema = z.record(
  z.string(),
  paymentMetadataValueSchema,
);

export const paymentStatusSchema = z.enum([
  "pending",
  "processing",
  "successful",
  "failed",
  "cancelled",
  "expired",
  "refunded",
]);

export const createPaymentSchema = z
  .object({
    productType:
      paymentProductTypeSchema,

    productId:
      objectIdSchema,

    optionId:
      z
        .string()
        .trim()
        .max(100)
        .optional(),

    currency:
      paymentCurrencySchema,

    idempotencyKey:
      z
        .string()
        .trim()
        .min(
          1,
          "Payment idempotency key is required.",
        )
        .max(
          200,
          "Payment idempotency key is invalid.",
        ),

    metadata:
      paymentMetadataSchema.optional(),
  })
  .strict()
  .superRefine(
    (
      value,
      context,
    ) => {
      if (
        (
          value.productType ===
            "programme" ||
          value.productType ===
            "workshop"
        ) &&
        !value.optionId
      ) {
        context.addIssue({
          code:
            z.ZodIssueCode.custom,
          path: [
            "optionId",
          ],
          message:
            value.productType ===
            "programme"
              ? "A programme pricing option is required."
              : "A workshop ticket type is required.",
        });
      }

      if (
        value.productType ===
          "service" &&
        value.optionId
      ) {
        context.addIssue({
          code:
            z.ZodIssueCode.custom,
          path: [
            "optionId",
          ],
          message:
            "Service payments do not require a pricing option.",
        });
      }
    },
  );

export const paymentTransactionReferenceSchema =
  z
    .object({
      transactionReference:
        transactionReferenceSchema,
    })
    .strict();

export const paymentIdSchema =
  z
    .object({
      paymentId:
        objectIdSchema,
    })
    .strict();

export const appointmentIdSchema =
  z
    .object({
      appointmentId:
        objectIdSchema,
    })
    .strict();

export const paymentAttemptNumberSchema =
  z
    .object({
      attemptNumber:
        z
          .number()
          .int()
          .min(1)
          .max(100),
    })
    .strict();

export const paymentAttemptNumberBodySchema =
  z
    .object({
      attemptNumber:
        z
          .number()
          .int()
          .min(1)
          .max(100),
    })
    .strict();

export const paymentIdWithAppointmentSchema =
  z
    .object({
      paymentId:
        objectIdSchema,

      appointmentId:
        objectIdSchema,
    })
    .strict();

export const paymentAdminIdSchema =
  z
    .object({
      paymentId:
        objectIdSchema,
    })
    .strict();

export const paymentAdminQuerySchema =
  z
    .object({
      page:
        z.coerce
          .number()
          .int()
          .min(1)
          .optional(),

      pageSize:
        z.coerce
          .number()
          .int()
          .min(1)
          .max(100)
          .optional(),

      status:
        paymentStatusSchema
          .optional(),

      productType:
        paymentProductTypeSchema
          .optional(),

      currency:
        paymentCurrencySchema
          .optional(),

      search:
        z
          .string()
          .trim()
          .max(200)
          .optional(),

      from:
        z
          .string()
          .trim()
          .optional(),

      to:
        z
          .string()
          .trim()
          .optional(),
    })
    .strict()
    .superRefine(
      (
        value,
        context,
      ) => {
        let fromDate:
          | Date
          | undefined;

        let toDate:
          | Date
          | undefined;

        if (
          value.from !==
          undefined
        ) {
          fromDate =
            new Date(
              value.from,
            );

          if (
            Number.isNaN(
              fromDate.getTime(),
            )
          ) {
            context.addIssue({
              code:
                z.ZodIssueCode.custom,
              path: [
                "from",
              ],
              message:
                "Invalid from date.",
            });
          }
        }

        if (
          value.to !==
          undefined
        ) {
          toDate =
            new Date(
              value.to,
            );

          if (
            Number.isNaN(
              toDate.getTime(),
            )
          ) {
            context.addIssue({
              code:
                z.ZodIssueCode.custom,
              path: [
                "to",
              ],
              message:
                "Invalid to date.",
            });
          }
        }

        if (
          fromDate &&
          toDate &&
          !Number.isNaN(
            fromDate.getTime(),
          ) &&
          !Number.isNaN(
            toDate.getTime(),
          ) &&
          fromDate > toDate
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,
            path: [
              "to",
            ],
            message:
              "The to date cannot be earlier than the from date.",
          });
        }
      },
    );

export type PaymentAdminQuery =
  z.infer<
    typeof paymentAdminQuerySchema
  >;

export type PaymentQueryValues =
  PaymentAdminQuery;

export function isValidObjectId(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    objectIdRegex.test(value) &&
    mongoose.Types.ObjectId.isValid(
      value,
    )
  );
}

export function isValidTransactionReference(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    transactionReferenceRegex.test(
      value.trim(),
    )
  );
}

export function normalizeEmail(
  value: string,
): string {
  return value
    .trim()
    .toLowerCase();
}

export function normalizePaymentCurrency(
  value: string,
): "USD" | "NGN" | "GBP" {
  const currency =
    value
      .trim()
      .toUpperCase();

  if (
    currency !== "USD" &&
    currency !== "NGN" &&
    currency !== "GBP"
  ) {
    throw new Error(
      "Unsupported payment currency.",
    );
  }

  return currency;
}

export function normalizePaymentProductType(
  value: string,
):
  | "service"
  | "programme"
  | "workshop" {
  const productType =
    value
      .trim()
      .toLowerCase();

  if (
    productType !== "service" &&
    productType !== "programme" &&
    productType !== "workshop"
  ) {
    throw new Error(
      "Unsupported payment product type.",
    );
  }

  return productType;
}