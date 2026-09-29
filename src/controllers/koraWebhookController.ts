import type {
  Request,
  Response,
} from "express";

import {
  PaymentEvent,
} from "../models/PaymentEvent.js";

import {
  Payment,
} from "../models/Payment.js";

import {
  PaymentRefund,
} from "../models/PaymentRefund.js";

import {
  paymentFulfilmentService,
} from "../services/paymentFulfilmentService.js";

import {
  paymentRefundService,
} from "../services/paymentRefundService.js";

import {
  canTransitionPaymentStatus,
  transitionPaymentStatus,
} from "../services/paymentStatusService.js";

import type {
  PaymentRefundStatus,
  PaymentStatus,
} from "../types/payment.js";

import {
  verifyWebhookSignature,
} from "../utils/webhookSignature.js";

interface KoraWebhookData {
  reference?: string;
  payment_reference?: string;

  status?: string;
  status_reason?: string;

  amount?: number | string;
  amount_paid?: number | string;

  currency?: string;
}

interface KoraWebhookBody {
  event?: string;
  data?: KoraWebhookData;
}

type PaymentEventDocument =
  InstanceType<typeof PaymentEvent>;

function getSignature(
  req: Request,
): string | undefined {
  const signature =
    req.headers[
      "x-korapay-signature"
    ];

  if (Array.isArray(signature)) {
    return signature[0];
  }

  return signature;
}

function normalizePaymentStatus(
  status: string | undefined,
): PaymentStatus | undefined {
  switch (
    status?.trim().toLowerCase()
  ) {
    case "success":
    case "successful":
    case "completed":
      return "successful";

    case "failed":
    case "failure":
      return "failed";

    case "cancelled":
    case "canceled":
      return "cancelled";

    case "expired":
      return "expired";

    case "processing":
      return "processing";

    case "pending":
      return "pending";

    case "refunded":
      return "refunded";

    default:
      return undefined;
  }
}

function normalizeRefundStatus(
  status: string | undefined,
): PaymentRefundStatus | undefined {
  switch (
    status?.trim().toLowerCase()
  ) {
    case "success":
    case "successful":
      return "successful";

    case "failed":
    case "failure":
      return "failed";

    case "processing":
    case "pending":
      return "processing";

    default:
      return undefined;
  }
}

function isRefundEvent(
  eventType: string,
): boolean {
  return (
    eventType === "refund.success" ||
    eventType === "refund.failed"
  );
}

function getErrorMessage(
  error: unknown,
): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected webhook error occurred.";
}

function toDecimalString(
  value: number | string | undefined,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return String(value);
}

async function findPayment(
  reference: string,
) {
  return Payment.findOne({
    $or: [
      {
        reference,
      },
      {
        providerReference:
          reference,
      },
    ],
  });
}

async function findRefund(
  reference: string,
) {
  return PaymentRefund.findOne({
    $or: [
      {
        reference,
      },
      {
        providerReference:
          reference,
      },
    ],
  });
}

function createEventId(
  eventType: string,
  data: KoraWebhookData,
): string {
  return [
    "korapay",
    eventType,
    data.reference ?? "",
    data.payment_reference ?? "",
    toDecimalString(
      data.amount,
    ) ?? "",
    toDecimalString(
      data.amount_paid,
    ) ?? "",
    data.currency ?? "",
  ].join(":");
}

async function markEventIgnored(
  event: PaymentEventDocument,
  message: string,
): Promise<void> {
  event.status = "ignored";
  event.processedAt = new Date();
  event.errorMessage = message;

  await event.save();
}

async function markEventFailed(
  event: PaymentEventDocument,
  message: string,
): Promise<void> {
  event.status = "failed";
  event.failedAt = new Date();
  event.errorMessage = message;

  await event.save();
}

async function handleRefundWebhook(
  event: PaymentEventDocument,
  data: KoraWebhookData,
): Promise<void> {
  const refundReference =
    data.reference?.trim();

  if (!refundReference) {
    await markEventIgnored(
      event,
      "Refund webhook reference is missing.",
    );
    return;
  }

  const refund =
    await findRefund(
      refundReference,
    );

  if (!refund) {
    await markEventIgnored(
      event,
      "Refund webhook received for an unknown refund.",
    );
    return;
  }

  event.paymentId =
    refund.paymentId;

  const nextStatus =
    normalizeRefundStatus(
      data.status,
    );

  if (!nextStatus) {
    await markEventIgnored(
      event,
      "Webhook received with an unsupported refund status.",
    );
    return;
  }

  if (
    data.currency &&
    data.currency.toUpperCase() !==
      refund.currency
  ) {
    await markEventFailed(
      event,
      "Refund webhook currency does not match the refund currency.",
    );
    return;
  }

  if (
    data.amount !== undefined &&
    String(data.amount) !==
      refund.amount.toString()
  ) {
    await markEventFailed(
      event,
      "Refund webhook amount does not match the refund amount.",
    );
    return;
  }

  const providerReference =
    refund.providerReference ??
    refund.reference;

  const updatedRefund =
    await paymentRefundService.handleRefundWebhook(
      providerReference,
      nextStatus,
      data.status_reason,
    );

  if (
    updatedRefund.status ===
    "successful"
  ) {
    const payment =
      await Payment.findById(
        refund.paymentId,
      );

    if (!payment) {
      throw new Error(
        "Payment associated with the refund was not found.",
      );
    }

    const fullyRefunded =
      await paymentRefundService.isPaymentFullyRefunded(
        payment._id,
      );

    if (
      fullyRefunded &&
      canTransitionPaymentStatus(
        payment.status,
        "refunded",
      )
    ) {
      transitionPaymentStatus(
        payment,
        "refunded",
      );

      await payment.save();
    }
  }

  event.status = "processed";
  event.processedAt = new Date();

  await event.save();
}

async function handleChargeWebhook(
  event: PaymentEventDocument,
  data: KoraWebhookData,
): Promise<void> {
  const providerReference =
    data.reference?.trim();

  if (!providerReference) {
    await markEventIgnored(
      event,
      "Webhook payment reference is missing.",
    );
    return;
  }

  const payment =
    await findPayment(
      providerReference,
    );

  if (!payment) {
    await markEventIgnored(
      event,
      "Webhook received for an unknown payment.",
    );
    return;
  }

  event.paymentId =
    payment._id;

  const nextStatus =
    normalizePaymentStatus(
      data.status,
    );

  if (!nextStatus) {
    await markEventIgnored(
      event,
      "Webhook received with an unsupported payment status.",
    );
    return;
  }

  if (
    !canTransitionPaymentStatus(
      payment.status,
      nextStatus,
    )
  ) {
    await markEventIgnored(
      event,
      `Invalid payment status transition: ${payment.status} -> ${nextStatus}.`,
    );
    return;
  }

  if (
    data.currency &&
    data.currency.toUpperCase() !==
      payment.currency
  ) {
    await markEventFailed(
      event,
      "Webhook currency does not match the payment currency.",
    );
    return;
  }

  if (
    data.amount !== undefined &&
    String(data.amount) !==
      payment.amount.toString()
  ) {
    await markEventFailed(
      event,
      "Webhook amount does not match the payment amount.",
    );
    return;
  }

  if (
    nextStatus === "successful" &&
    data.amount_paid !== undefined &&
    String(data.amount_paid) !==
      payment.amount.toString()
  ) {
    await markEventFailed(
      event,
      "Webhook amount paid does not match the payment amount.",
    );
    return;
  }

  transitionPaymentStatus(
    payment,
    nextStatus,
  );

  await payment.save();

  if (
    nextStatus === "successful"
  ) {
    await paymentFulfilmentService.fulfilPayment(
      payment._id,
    );
  }

  event.status = "processed";
  event.processedAt = new Date();

  await event.save();
}

export async function handleKoraWebhook(
  req: Request,
  res: Response,
): Promise<void> {
  const body =
    req.body as KoraWebhookBody;

  const eventType =
    body.event?.trim() ||
    "unknown";

  const data = body.data;

  if (
    !data ||
    typeof data !== "object"
  ) {
    res.status(400).json({
      success: false,
      message:
        "Invalid webhook payload.",
    });
    return;
  }

  const providerReference =
    data.reference?.trim();

  if (!providerReference) {
    res.status(400).json({
      success: false,
      message:
        "Webhook reference is required.",
    });
    return;
  }

  const signature =
    getSignature(req);

  const secret =
    process.env.KORA_SECRET_KEY?.trim();

  if (!secret) {
    res.status(500).json({
      success: false,
      message:
        "Kora webhook secret is not configured.",
    });
    return;
  }

  const validSignature =
    verifyWebhookSignature(
      data,
      signature ?? "",
      secret,
    );

  if (!validSignature) {
    res.status(401).json({
      success: false,
      message:
        "Invalid webhook signature.",
    });
    return;
  }

  const eventId =
    createEventId(
      eventType,
      data,
    );

  const existingEvent =
    await PaymentEvent.findOne({
      provider: "korapay",
      eventId,
    });

  if (existingEvent) {
    res.status(200).json({
      success: true,
      message:
        "Webhook already processed.",
    });
    return;
  }

  let paymentId:
    | typeof Payment.prototype._id
    | undefined;

  try {
    if (
      isRefundEvent(eventType)
    ) {
      const refund =
        await findRefund(
          providerReference,
        );

      paymentId =
        refund?.paymentId;
    } else {
      const payment =
        await findPayment(
          providerReference,
        );

      paymentId =
        payment?._id;
    }

    const event =
      new PaymentEvent({
        provider: "korapay",
        eventId,
        eventType,
        providerReference,
        paymentId,
        status: "received",
        payload: req.body,
      });

    try {
      await event.save();
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code?: number })
          .code === 11000
      ) {
        res.status(200).json({
          success: true,
          message:
            "Webhook already received.",
        });
        return;
      }

      throw error;
    }

    if (
      isRefundEvent(eventType)
    ) {
      await handleRefundWebhook(
        event,
        data,
      );
    } else {
      await handleChargeWebhook(
        event,
        data,
      );
    }

    res.status(200).json({
      success: true,
      message:
        "Webhook processed successfully.",
    });
  } catch (error) {
    const failedEvent =
      await PaymentEvent.findOne({
        provider: "korapay",
        eventId,
      });

    if (failedEvent) {
      failedEvent.paymentId =
        paymentId;

      failedEvent.status =
        "failed";

      failedEvent.failedAt =
        new Date();

      failedEvent.errorMessage =
        getErrorMessage(error);

      await failedEvent.save();
    }

    res.status(500).json({
      success: false,
      message:
        "Webhook processing failed.",
    });
  }
}