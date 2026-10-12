
import type {
  Request,
  Response,
} from "express";

import type {
  PaymentStatus,
} from "../types/payment.js";

import {
  paymentService,
} from "../services/paymentService.js";

import {
  paymentRefundService,
} from "../services/paymentRefundService.js";

import {
  KoraRateLimitError,
} from "../providers/koraProvider.js";

const PAYMENT_STATUSES: readonly PaymentStatus[] = [
  "pending",
  "processing",
  "successful",
  "failed",
  "cancelled",
  "expired",
  "refunded",
];

const ADMIN_REQUIRED =
  "Administrator access is required.";

const RESOURCE_NOT_FOUND =
  "Resource was not found.";

function getClientId(req: Request): string {
  const clientId = req.user?.clientId;

  if (
    typeof clientId !== "string" ||
    !clientId.trim()
  ) {
    throw new Error(
      "Authenticated client identity is required.",
    );
  }

  return clientId.trim();
}

function requireAdmin(req: Request): void {
  if (req.user?.role !== "admin") {
    throw new Error(ADMIN_REQUIRED);
  }
}

function getRouteParam(
  req: Request,
  name: string,
  label: string,
): string {
  const value = req.params[name];

  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(`${label} is required.`);
  }

  return value.trim();
}

function getReference(req: Request): string {
  return getRouteParam(
    req,
    "reference",
    "Payment reference",
  );
}

function getRefundReference(req: Request): string {
  return getRouteParam(
    req,
    "reference",
    "Refund reference",
  );
}

function getRefundId(req: Request): string {
  return getRouteParam(
    req,
    "refundId",
    "Refund ID",
  );
}

function getPaymentId(req: Request): string {
  return getRouteParam(
    req,
    "paymentId",
    "Payment ID",
  );
}

function getOptionalPositiveInteger(
  value: unknown,
  field: string,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      `${field} must be a positive whole number.`,
    );
  }

  const parsed = Number(value);

  if (
    !Number.isSafeInteger(parsed) ||
    parsed < 1
  ) {
    throw new Error(
      `${field} must be a positive whole number.`,
    );
  }

  return parsed;
}

function getOptionalNonNegativeInteger(
  value: unknown,
  field: string,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      `${field} must be a non-negative whole number.`,
    );
  }

  const parsed = Number(value);

  if (
    !Number.isSafeInteger(parsed) ||
    parsed < 0
  ) {
    throw new Error(
      `${field} must be a non-negative whole number.`,
    );
  }

  return parsed;
}

function getOptionalPaymentStatus(
  value: unknown,
): PaymentStatus | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error("Invalid payment status.");
  }

  const status = value.trim();

  if (
    !PAYMENT_STATUSES.includes(
      status as PaymentStatus,
    )
  ) {
    throw new Error("Invalid payment status.");
  }

  return status as PaymentStatus;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected payment error occurred.";
}

function getErrorStatusCode(
  error: unknown,
): number {
  const message = getErrorMessage(error);

  if (message === ADMIN_REQUIRED) {
    return 403;
  }

  if (
    message ===
      "Authenticated client identity is required."
  ) {
    return 401;
  }

  if (
    message === "Payment was not found." ||
    message === "Refund was not found." ||
    message === RESOURCE_NOT_FOUND
  ) {
    return 404;
  }

  if (
    /already (?:paid|exists|exists for|has been)|already have|duplicate|conflict|active reservation|reservation already/i.test(
      message,
    )
  ) {
    return 409;
  }

  if (
    /required|invalid|must be|unsupported|does not match|cannot |only successful|not permitted|not found/i.test(
      message,
    )
  ) {
    return 400;
  }

  return 500;
}

function sendError(
  res: Response,
  error: unknown,
): void {
  if (error instanceof KoraRateLimitError) {
    if (error.retryAfterSeconds !== undefined) {
      res.set(
        "Retry-After",
        String(error.retryAfterSeconds),
      );
    }

    res.status(429).json({
      success: false,
      code: "PAYMENT_PROVIDER_RATE_LIMITED",
      message: error.message,
      ...(error.retryAfterSeconds !== undefined && {
        retryAfterSeconds: error.retryAfterSeconds,
      }),
    });

    return;
  }

  const statusCode = getErrorStatusCode(error);

  res.status(statusCode).json({
    success: false,
    message:
      statusCode === 500
        ? "An unexpected server error occurred."
        : getErrorMessage(error),
  });
}

function serializePayment(
  payment: {
    _id: unknown;
    reference: string;
    providerReference?: string;
    productType: unknown;
    productId: unknown;
    optionId?: string;
    productName: string;
    optionName?: string;
    amount: {
      toString(): string;
    };
    currency: string;
    status: PaymentStatus;
    checkoutUrl?: string;
    paidAt?: Date;
    failureReason?: string;
    createdAt: Date;
    updatedAt: Date;
  },
) {
  return {
    paymentId: payment._id,
    reference: payment.reference,
    providerReference: payment.providerReference,
    productType: payment.productType,
    productId: payment.productId,
    optionId: payment.optionId,
    productName: payment.productName,
    optionName: payment.optionName,
    amount: payment.amount.toString(),
    currency: payment.currency,
    status: payment.status,
    checkoutUrl: payment.checkoutUrl,
    paidAt: payment.paidAt,
    failureReason: payment.failureReason,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}

function serializeRefund(
  refund: {
    _id: unknown;
    paymentId: unknown;
    clientId: unknown;
    reference: string;
    providerReference?: string;
    amount: {
      toString(): string;
    };
    currency: string;
    status: string;
    reason?: string;
    failureReason?: string;
    requestedAt: Date;
    completedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
  },
) {
  return {
    refundId: refund._id,
    paymentId: refund.paymentId,
    clientId: refund.clientId,
    reference: refund.reference,
    providerReference: refund.providerReference,
    amount: refund.amount.toString(),
    currency: refund.currency,
    status: refund.status,
    reason: refund.reason,
    failureReason: refund.failureReason,
    requestedAt: refund.requestedAt,
    completedAt: refund.completedAt,
    createdAt: refund.createdAt,
    updatedAt: refund.updatedAt,
  };
}

export async function initializePayment(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const payment = await paymentService.createPayment(
      getClientId(req),
      req.body,
    );

    res.status(201).json({
      success: true,
      message: "Payment initialized successfully.",
      data: serializePayment(payment),
    });
  } catch (error) {
    sendError(res, error);
  }
}

export async function verifyPayment(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const clientId = getClientId(req);
    const reference = getReference(req);

    const payment =
      await paymentService.getPaymentByReference(
        clientId,
        reference,
      );

    if (!payment) {
      res.status(404).json({
        success: false,
        message: "Payment was not found.",
      });

      return;
    }

    const verifiedPayment =
      await paymentService.verifyPayment(
        payment.reference,
      );

    res.status(200).json({
      success: true,
      message: "Payment status retrieved successfully.",
      data: serializePayment(verifiedPayment),
    });
  } catch (error) {
    sendError(res, error);
  }
}

export async function getPayment(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const payment =
      await paymentService.getPaymentByReference(
        getClientId(req),
        getReference(req),
      );

    if (!payment) {
      res.status(404).json({
        success: false,
        message: "Payment was not found.",
      });

      return;
    }

    res.status(200).json({
      success: true,
      data: serializePayment(payment),
    });
  } catch (error) {
    sendError(res, error);
  }
}

export async function getMyPayments(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const payments = await paymentService.getMyPayments(
      getClientId(req),
      {
        status: getOptionalPaymentStatus(
          req.query.status,
        ),
        limit: getOptionalPositiveInteger(
          req.query.limit,
          "limit",
        ),
        skip: getOptionalNonNegativeInteger(
          req.query.skip,
          "skip",
        ),
      },
    );

    res.status(200).json({
      success: true,
      data: payments.map(serializePayment),
    });
  } catch (error) {
    sendError(res, error);
  }
}

export async function getAdminPayments(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    requireAdmin(req);

    const result = await paymentService.getAdminPayments({
      status: getOptionalPaymentStatus(
        req.query.status,
      ),
      limit: getOptionalPositiveInteger(
        req.query.limit,
        "limit",
      ),
      skip: getOptionalNonNegativeInteger(
        req.query.skip,
        "skip",
      ),
    });

    res.status(200).json({
      success: true,
      data: {
        payments: result.payments.map(serializePayment),
        total: result.total,
        limit: result.limit,
        skip: result.skip,
      },
    });
  } catch (error) {
    sendError(res, error);
  }
}

export async function createRefund(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    requireAdmin(req);

    const paymentId = getPaymentId(req);

    const amount =
      typeof req.body?.amount === "string"
        ? req.body.amount.trim()
        : undefined;

    const reason =
      typeof req.body?.reason === "string"
        ? req.body.reason.trim()
        : undefined;

    const webhookUrl =
      typeof req.body?.webhookUrl === "string"
        ? req.body.webhookUrl.trim()
        : undefined;

    const result =
      await paymentRefundService.createRefund({
        paymentId,
        amount,
        reason,
        webhookUrl,
      });

    res.status(201).json({
      success: true,
      message: "Refund initiated successfully.",
      data: {
        payment: serializePayment(result.payment),
        refund: serializeRefund(result.refund),
        refundedAmount: result.refundedAmount.toString(),
        remainingRefundableAmount:
          result.remainingRefundableAmount.toString(),
      },
    });
  } catch (error) {
    sendError(res, error);
  }
}

export async function getRefund(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const clientId = getClientId(req);
    const reference = getRefundReference(req);

    const refund =
      await paymentRefundService.getRefundByReference(
        reference,
      );

    if (refund.clientId.toString() !== clientId) {
      res.status(404).json({
        success: false,
        message: "Refund was not found.",
      });

      return;
    }

    res.status(200).json({
      success: true,
      data: serializeRefund(refund),
    });
  } catch (error) {
    sendError(res, error);
  }
}

export async function getMyRefunds(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const refunds =
      await paymentRefundService.getRefundsForClient(
        getClientId(req),
        {
          limit: getOptionalPositiveInteger(
            req.query.limit,
            "limit",
          ),
          skip: getOptionalNonNegativeInteger(
            req.query.skip,
            "skip",
          ),
        },
      );

    res.status(200).json({
      success: true,
      data: refunds.map(serializeRefund),
    });
  } catch (error) {
    sendError(res, error);
  }
}

export async function getPaymentRefunds(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const payment =
      await paymentService.getPaymentByIdForClient(
        getClientId(req),
        getPaymentId(req),
      );

    if (!payment) {
      res.status(404).json({
        success: false,
        message: "Payment was not found.",
      });

      return;
    }

    const refunds =
      await paymentRefundService.getRefundsForPayment(
        payment._id.toString(),
      );

    res.status(200).json({
      success: true,
      data: refunds.map(serializeRefund),
    });
  } catch (error) {
    sendError(res, error);
  }
}

export async function getPaymentRefundTotals(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const payment =
      await paymentService.getPaymentByIdForClient(
        getClientId(req),
        getPaymentId(req),
      );

    if (!payment) {
      res.status(404).json({
        success: false,
        message: "Payment was not found.",
      });

      return;
    }

    const totals =
      await paymentRefundService.getRefundTotals(
        payment._id.toString(),
      );

    res.status(200).json({
      success: true,
      data: {
        paymentAmount: totals.paymentAmount.toString(),
        refundedAmount: totals.refundedAmount.toString(),
        remainingRefundableAmount:
          totals.remainingRefundableAmount.toString(),
      },
    });
  } catch (error) {
    sendError(res, error);
  }
}

export async function refreshRefund(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    requireAdmin(req);

    const refund =
      await paymentRefundService.refreshRefund(
        getRefundId(req),
      );

    res.status(200).json({
      success: true,
      message: "Refund status refreshed successfully.",
      data: serializeRefund(refund),
    });
  } catch (error) {
    sendError(res, error);
  }
}

export async function getAdminRefund(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    requireAdmin(req);

    const refund =
      await paymentRefundService.getRefundByReference(
        getRefundReference(req),
      );

    res.status(200).json({
      success: true,
      data: serializeRefund(refund),
    });
  } catch (error) {
    sendError(res, error);
  }
}
