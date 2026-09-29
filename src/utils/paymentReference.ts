import crypto from "node:crypto";

const PAYMENT_REFERENCE_PREFIX = "SNS";

export function generatePaymentReference(): string {
  const timestamp =
    Date.now().toString(36).toUpperCase();

  const randomPart =
    crypto
      .randomBytes(5)
      .toString("hex")
      .toUpperCase();

  return `${PAYMENT_REFERENCE_PREFIX}-${timestamp}-${randomPart}`;
}