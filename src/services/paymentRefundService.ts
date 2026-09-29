import crypto from "node:crypto";

import mongoose from "mongoose";

import {
  Payment,
  type IPayment,
} from "../models/Payment.js";

import {
  PaymentRefund,
  type IPaymentRefund,
} from "../models/PaymentRefund.js";

import type {
  PaymentRefundStatus,
} from "../types/payment.js";

import type {
  Currency,
} from "../config/currencies.js";

import {
  koraProvider,
} from "../providers/koraProvider.js";

import {
  canTransitionPaymentStatus,
  transitionPaymentStatus,
} from "./paymentStatusService.js";

const REFUND_REFERENCE_PREFIX = "SNS-REF-";
const REFUND_REFERENCE_LENGTH = 16;

function createRefundReference(): string {
  return `${REFUND_REFERENCE_PREFIX}${crypto
    .randomBytes(REFUND_REFERENCE_LENGTH)
    .toString("hex")
    .toUpperCase()}`;
}

function decimalToMinorUnits(
  value: mongoose.Types.Decimal128,
): bigint {
  const normalized = value.toString().trim();

  if (!normalized) {
    throw new Error("Invalid monetary amount.");
  }

  const parts = normalized.split(".");
  const integerPart = parts[0];
  const fractionalPart = parts[1] ?? "";

  if (!integerPart) {
    throw new Error(
      `Invalid monetary amount: ${value.toString()}.`,
    );
  }

  const sign = integerPart.startsWith("-")
    ? "-"
    : "";

  const absoluteInteger = integerPart.replace(
    /^-/,
    "",
  );

  const fraction = fractionalPart
    .padEnd(2, "0")
    .slice(0, 2);

  if (
    !/^\d+$/.test(absoluteInteger) ||
    !/^\d{2}$/.test(fraction)
  ) {
    throw new Error(
      `Invalid monetary amount: ${value.toString()}.`,
    );
  }

  const minorUnits =
    BigInt(absoluteInteger) * 100n +
    BigInt(fraction);

  return sign === "-"
    ? -minorUnits
    : minorUnits;
}

function minorUnitsToDecimal(
  value: bigint,
): mongoose.Types.Decimal128 {
  const negative = value < 0n;
  const absolute = negative ? -value : value;

  const integerPart = absolute / 100n;
  const fractionalPart = absolute % 100n;

  const result =
    `${negative ? "-" : ""}` +
    `${integerPart.toString()}.` +
    fractionalPart
      .toString()
      .padStart(2, "0");

  return mongoose.Types.Decimal128.fromString(
    result,
  );
}

function validateRefundAmount(
  payment: IPayment,
  amount: mongoose.Types.Decimal128,
): void {
  const paymentMinorUnits =
    decimalToMinorUnits(
      payment.amount,
    );

  const refundMinorUnits =
    decimalToMinorUnits(
      amount,
    );

  if (refundMinorUnits <= 0n) {
    throw new Error(
      "Refund amount must be greater than zero.",
    );
  }

  if (refundMinorUnits > paymentMinorUnits) {
    throw new Error(
      "Refund amount cannot exceed the original payment amount.",
    );
  }
}

async function getRefundAmounts(
  paymentId: mongoose.Types.ObjectId,
): Promise<{
  successful: mongoose.Types.Decimal128;
  reserved: mongoose.Types.Decimal128;
}> {
  const refunds =
    await PaymentRefund.find({
      paymentId,
      status: {
        $in: [
          "processing",
          "successful",
        ],
      },
    })
      .select("amount status")
      .lean();

  let successfulMinorUnits = 0n;
  let reservedMinorUnits = 0n;

  for (const refund of refunds) {
    const amountMinorUnits =
      decimalToMinorUnits(
        refund.amount,
      );

    if (refund.status === "successful") {
      successfulMinorUnits +=
        amountMinorUnits;
    }

    reservedMinorUnits +=
      amountMinorUnits;
  }

  return {
    successful:
      minorUnitsToDecimal(
        successfulMinorUnits,
      ),

    reserved:
      minorUnitsToDecimal(
        reservedMinorUnits,
      ),
  };
}

function getRemainingRefundableAmount(
  payment: IPayment,
  reservedRefundAmount:
    mongoose.Types.Decimal128,
): mongoose.Types.Decimal128 {
  const paymentMinorUnits =
    decimalToMinorUnits(
      payment.amount,
    );

  const reservedMinorUnits =
    decimalToMinorUnits(
      reservedRefundAmount,
    );

  const remaining =
    paymentMinorUnits -
    reservedMinorUnits;

  return minorUnitsToDecimal(
    remaining < 0n
      ? 0n
      : remaining,
  );
}

function getCurrency(
  payment: IPayment,
): Currency {
  return payment.currency;
}

function getErrorMessage(
  error: unknown,
): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected refund error occurred.";
}

async function findPayment(
  paymentId: string,
): Promise<IPayment> {
  if (
    !mongoose.Types.ObjectId.isValid(
      paymentId,
    )
  ) {
    throw new Error(
      "Invalid payment ID.",
    );
  }

  const payment =
    await Payment.findById(
      paymentId,
    );

  if (!payment) {
    throw new Error(
      "Payment not found.",
    );
  }

  return payment;
}

async function markPaymentRefundedIfComplete(
  paymentId: mongoose.Types.ObjectId,
): Promise<void> {
  const payment =
    await Payment.findById(
      paymentId,
    );

  if (!payment) {
    throw new Error(
      "Payment not found.",
    );
  }

  if (payment.status !== "successful") {
    return;
  }

  const {
    successful,
  } = await getRefundAmounts(
    paymentId,
  );

  const fullyRefunded =
    decimalToMinorUnits(
      successful,
    ) >=
    decimalToMinorUnits(
      payment.amount,
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

export interface CreatePaymentRefundInput {
  paymentId: string;
  amount?: string;
  reason?: string;
  webhookUrl?: string;
}

export interface PaymentRefundSummary {
  payment: IPayment;
  refund: IPaymentRefund;
  refundedAmount: mongoose.Types.Decimal128;
  remainingRefundableAmount: mongoose.Types.Decimal128;
}

class PaymentRefundService {
  async createRefund(
    input: CreatePaymentRefundInput,
  ): Promise<PaymentRefundSummary> {
    const payment =
      await findPayment(
        input.paymentId,
      );

    if (payment.status !== "successful") {
      throw new Error(
        "Only successful payments can be refunded.",
      );
    }

    if (
      !payment.providerReference?.trim()
    ) {
      throw new Error(
        "Payment does not have a provider reference and cannot be refunded.",
      );
    }

    const requestedAmount =
      input.amount?.trim();

    let amount: mongoose.Types.Decimal128;

    try {
      amount = requestedAmount
        ? mongoose.Types.Decimal128.fromString(
            requestedAmount,
          )
        : payment.amount;
    } catch {
      throw new Error(
        "Invalid refund amount.",
      );
    }

    validateRefundAmount(
      payment,
      amount,
    );

    const {
      successful:
        successfulRefundedAmount,
      reserved:
        reservedRefundAmount,
    } = await getRefundAmounts(
      payment._id,
    );

    const remainingRefundableAmount =
      getRemainingRefundableAmount(
        payment,
        reservedRefundAmount,
      );

    const requestedMinorUnits =
      decimalToMinorUnits(
        amount,
      );

    const remainingMinorUnits =
      decimalToMinorUnits(
        remainingRefundableAmount,
      );

    if (
      requestedMinorUnits >
      remainingMinorUnits
    ) {
      throw new Error(
        `Refund amount exceeds the remaining refundable amount of ${remainingRefundableAmount.toString()}.`,
      );
    }

    const refund =
      new PaymentRefund({
        paymentId:
          payment._id,

        clientId:
          payment.clientId,

        reference:
          createRefundReference(),

        amount,

        currency:
          getCurrency(payment),

        status:
          "processing",

        reason:
          input.reason?.trim() ||
          undefined,

        requestedAt:
          new Date(),
      });

    await refund.save();

    try {
      const providerResult =
        await koraProvider.refund({
          paymentReference:
            payment.providerReference,

          refundReference:
            refund.reference,

          amount:
            refund.amount,

          currency:
            refund.currency,

          reason:
            refund.reason,

          webhookUrl:
            input.webhookUrl,
        });

      refund.providerReference =
        providerResult.providerReference;

      refund.status =
        providerResult.status;

      if (
        providerResult.status ===
        "failed"
      ) {
        refund.failureReason =
          "The payment provider rejected or failed the refund.";

        refund.completedAt =
          new Date();
      }

      if (
        providerResult.status ===
        "successful"
      ) {
        refund.completedAt =
          new Date();
      }

      await refund.save();

      if (
        providerResult.status ===
        "successful"
      ) {
        await markPaymentRefundedIfComplete(
          payment._id,
        );
      }

      const {
        successful:
          totalSuccessfulRefunded,
        reserved:
          totalReservedRefunded,
      } = await getRefundAmounts(
        payment._id,
      );

      const remainingAfterRequest =
        getRemainingRefundableAmount(
          payment,
          totalReservedRefunded,
        );

      return {
        payment,

        refund,

        refundedAmount:
          totalSuccessfulRefunded,

        remainingRefundableAmount:
          remainingAfterRequest,
      };
    } catch (error) {
      refund.status =
        "failed";

      refund.failureReason =
        getErrorMessage(error);

      refund.completedAt =
        new Date();

      await refund.save();

      throw error;
    }
  }

  async getRefundByReference(
    reference: string,
  ): Promise<IPaymentRefund> {
    const normalizedReference =
      reference.trim();

    if (!normalizedReference) {
      throw new Error(
        "Refund reference is required.",
      );
    }

    const refund =
      await PaymentRefund.findOne({
        reference:
          normalizedReference,
      });

    if (!refund) {
      throw new Error(
        "Refund not found.",
      );
    }

    return refund;
  }

  async getRefundByProviderReference(
    providerReference: string,
  ): Promise<IPaymentRefund> {
    const normalizedReference =
      providerReference.trim();

    if (!normalizedReference) {
      throw new Error(
        "Provider refund reference is required.",
      );
    }

    const refund =
      await PaymentRefund.findOne({
        providerReference:
          normalizedReference,
      });

    if (!refund) {
      throw new Error(
        "Refund not found.",
      );
    }

    return refund;
  }

  async getRefundsForPayment(
    paymentId: string,
  ): Promise<IPaymentRefund[]> {
    if (
      !mongoose.Types.ObjectId.isValid(
        paymentId,
      )
    ) {
      throw new Error(
        "Invalid payment ID.",
      );
    }

    return PaymentRefund.find({
      paymentId,
    })
      .sort({
        createdAt: -1,
      })
      .exec();
  }

  async getRefundsForClient(
    clientId: string,
    options?: {
      limit?: number;
      skip?: number;
    },
  ): Promise<IPaymentRefund[]> {
    if (
      !mongoose.Types.ObjectId.isValid(
        clientId,
      )
    ) {
      throw new Error(
        "Invalid client ID.",
      );
    }

    const limit = Math.min(
      Math.max(
        options?.limit ?? 20,
        1,
      ),
      100,
    );

    const skip = Math.max(
      options?.skip ?? 0,
      0,
    );

    return PaymentRefund.find({
      clientId,
    })
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async refreshRefund(
    refundId: string,
  ): Promise<IPaymentRefund> {
    if (
      !mongoose.Types.ObjectId.isValid(
        refundId,
      )
    ) {
      throw new Error(
        "Invalid refund ID.",
      );
    }

    const refund =
      await PaymentRefund.findById(
        refundId,
      );

    if (!refund) {
      throw new Error(
        "Refund not found.",
      );
    }

    if (
      !refund.providerReference?.trim()
    ) {
      throw new Error(
        "Refund does not have a provider reference.",
      );
    }

    if (
      refund.status ===
        "successful" ||
      refund.status ===
        "failed"
    ) {
      return refund;
    }

    const providerResult =
      await koraProvider.getRefund(
        refund.providerReference,
      );

    refund.status =
      providerResult.status;

    if (
      providerResult.status ===
      "failed"
    ) {
      refund.failureReason =
        "The payment provider reported that the refund failed.";

      refund.completedAt =
        new Date();
    }

    if (
      providerResult.status ===
      "successful"
    ) {
      refund.failureReason =
        undefined;

      refund.completedAt =
        new Date();
    }

    await refund.save();

    if (
      providerResult.status ===
      "successful"
    ) {
      await markPaymentRefundedIfComplete(
        refund.paymentId,
      );
    }

    return refund;
  }

  async handleRefundWebhook(
    providerReference: string,
    status: PaymentRefundStatus,
    failureReason?: string,
  ): Promise<IPaymentRefund> {
    const refund =
      await this.getRefundByProviderReference(
        providerReference,
      );

    if (
      refund.status ===
        "successful" ||
      refund.status ===
        "failed"
    ) {
      return refund;
    }

    refund.status = status;

    if (status === "successful") {
      refund.failureReason =
        undefined;

      refund.completedAt =
        new Date();
    }

    if (status === "failed") {
      refund.failureReason =
        failureReason ||
        "The payment provider reported that the refund failed.";

      refund.completedAt =
        new Date();
    }

    await refund.save();

    if (status === "successful") {
      await markPaymentRefundedIfComplete(
        refund.paymentId,
      );
    }

    return refund;
  }

  async isPaymentFullyRefunded(
    paymentId: mongoose.Types.ObjectId,
  ): Promise<boolean> {
    const payment =
      await Payment.findById(
        paymentId,
      )
        .select("amount")
        .lean();

    if (!payment) {
      throw new Error(
        "Payment not found.",
      );
    }

    const {
      successful:
        refundedAmount,
    } = await getRefundAmounts(
      paymentId,
    );

    return (
      decimalToMinorUnits(
        refundedAmount,
      ) >=
      decimalToMinorUnits(
        payment.amount,
      )
    );
  }

  async getRefundTotals(
    paymentId: string,
  ): Promise<{
    paymentAmount: mongoose.Types.Decimal128;
    refundedAmount: mongoose.Types.Decimal128;
    remainingRefundableAmount: mongoose.Types.Decimal128;
  }> {
    const payment =
      await findPayment(
        paymentId,
      );

    const {
      successful:
        refundedAmount,
      reserved:
        reservedRefundAmount,
    } = await getRefundAmounts(
      payment._id,
    );

    const remainingRefundableAmount =
      getRemainingRefundableAmount(
        payment,
        reservedRefundAmount,
      );

    return {
      paymentAmount:
        payment.amount,

      refundedAmount,

      remainingRefundableAmount,
    };
  }
}

export const paymentRefundService =
  new PaymentRefundService();

export default paymentRefundService;