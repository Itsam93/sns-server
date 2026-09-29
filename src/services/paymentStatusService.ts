import type { PaymentStatus } from "../types/payment.js";

const STATUS_TRANSITIONS: Record<
  PaymentStatus,
  readonly PaymentStatus[]
> = {
  pending: [
    "pending",
    "processing",
    "successful",
    "failed",
    "cancelled",
    "expired",
  ],

  processing: [
    "processing",
    "successful",
    "failed",
    "cancelled",
    "expired",
  ],

  successful: [
    "successful",
    "refunded",
  ],

  failed: [
    "failed",
    "pending",
    "processing",
  ],

  cancelled: [
    "cancelled",
    "pending",
    "processing",
  ],

  expired: [
    "expired",
    "pending",
    "processing",
  ],

  refunded: [
    "refunded",
  ],
};

export class PaymentStatusError extends Error {
  constructor(
    message: string,
    public readonly currentStatus: PaymentStatus,
    public readonly requestedStatus: PaymentStatus,
  ) {
    super(message);
    this.name = "PaymentStatusError";
  }
}

export function canTransitionPaymentStatus(
  currentStatus: PaymentStatus,
  nextStatus: PaymentStatus,
): boolean {
  return STATUS_TRANSITIONS[
    currentStatus
  ].includes(nextStatus);
}

export function assertPaymentStatusTransition(
  currentStatus: PaymentStatus,
  nextStatus: PaymentStatus,
): void {
  if (
    canTransitionPaymentStatus(
      currentStatus,
      nextStatus,
    )
  ) {
    return;
  }

  throw new PaymentStatusError(
    `Invalid payment status transition: ${currentStatus} -> ${nextStatus}.`,
    currentStatus,
    nextStatus,
  );
}

export interface PaymentStatusTransitionTarget {
  status: PaymentStatus;
  paidAt?: Date;
  failedAt?: Date;
  cancelledAt?: Date;
  expiredAt?: Date;
  refundedAt?: Date;
  failureReason?: string;
}

export function transitionPaymentStatus(
  payment: PaymentStatusTransitionTarget,
  nextStatus: PaymentStatus,
  options?: {
    failureReason?: string;
  },
): void {
  assertPaymentStatusTransition(
    payment.status,
    nextStatus,
  );

  if (payment.status === nextStatus) {
    if (
      nextStatus === "failed" &&
      options?.failureReason
    ) {
      payment.failureReason =
        options.failureReason;
    }

    return;
  }

  payment.status = nextStatus;

  switch (nextStatus) {
    case "successful":
      payment.paidAt = new Date();
      payment.failureReason = undefined;
      break;

    case "failed":
      payment.failedAt = new Date();
      payment.failureReason =
        options?.failureReason;
      break;

    case "cancelled":
      payment.cancelledAt = new Date();
      break;

    case "expired":
      payment.expiredAt = new Date();
      break;

    case "refunded":
      payment.refundedAt = new Date();
      break;

    case "pending":
    case "processing":
      break;
  }
}