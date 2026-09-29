import mongoose from "mongoose";

import {
  isSupportedCurrency,
  type Currency,
} from "../config/currencies.js";

import { Client } from "../models/Client.js";
import { Payment } from "../models/Payment.js";
import { Programme } from "../models/Programme.js";
import { Service } from "../models/Service.js";
import { User } from "../models/User.js";
import { Workshop } from "../models/Workshop.js";

import type {
  CreatePaymentInput,
  PaymentCustomer,
  PaymentProductType,
  PaymentProviderVerificationResult,
  PaymentStatus,
  ResolvedPaymentProduct,
} from "../types/payment.js";

import { generatePaymentReference } from "../utils/paymentReference.js";

import type { PaymentProvider } from "../providers/PaymentProvider.js";
import { KoraRateLimitError } from "../providers/koraProvider.js";
import { createPaymentProvider } from "../providers/paymentProviderFactory.js";

import {
  canTransitionPaymentStatus,
  transitionPaymentStatus,
} from "./paymentStatusService.js";

import { paymentFulfilmentService } from "./paymentFulfilmentService.js";

const PAYMENT_REDIRECT_PATH =
  "/portal/payments/callback";

const PAYMENT_STATUSES = [
  "pending",
  "processing",
  "successful",
  "failed",
  "cancelled",
  "expired",
  "refunded",
] as const;

type ChargeVerificationStatus =
  | "pending"
  | "processing"
  | "successful"
  | "failed"
  | "cancelled"
  | "expired";

function normalizeCurrency(
  currency: string,
): Currency {
  const normalized =
    currency.trim().toUpperCase();

  if (!isSupportedCurrency(normalized)) {
    throw new Error(
      `Unsupported payment currency: ${currency}.`,
    );
  }

  return normalized;
}

function getPaymentRedirectUrl(): string {
  const clientUrl =
    process.env.CLIENT_URL?.trim();

  if (!clientUrl) {
    throw new Error(
      "CLIENT_URL environment variable is required.",
    );
  }

  return `${clientUrl.replace(/\/+$/, "")}${PAYMENT_REDIRECT_PATH}`;
}

function getDecimalParts(
  value:
    | mongoose.Types.Decimal128
    | string
    | number,
): {
  sign: 1 | -1;
  coefficient: bigint;
  scale: number;
} {
  const rawValue =
    value instanceof mongoose.Types.Decimal128
      ? value.toString()
      : String(value);

  const normalized =
    rawValue.trim();

  const match =
    normalized.match(
      /^([+-]?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/,
    );

  if (!match) {
    throw new Error(
      `Invalid decimal value: ${rawValue}.`,
    );
  }

  const sign =
    match[1] === "-"
      ? -1
      : 1;

  const integerPart =
    match[2];

  const fractionalPart =
    match[3] ?? "";

  const exponent =
    Number(match[4] ?? "0");

  if (!Number.isSafeInteger(exponent)) {
    throw new Error(
      `Invalid decimal exponent: ${rawValue}.`,
    );
  }

  let coefficient =
    BigInt(
      `${integerPart}${fractionalPart}`,
    );

  let scale =
    fractionalPart.length -
    exponent;

  if (coefficient === 0n) {
    return {
      sign: 1,
      coefficient: 0n,
      scale: 0,
    };
  }

  while (
    coefficient % 10n ===
      0n &&
    scale > 0
  ) {
    coefficient /=
      10n;

    scale -= 1;
  }

  return {
    sign,
    coefficient,
    scale,
  };
}

function decimalsEqual(
  left:
    | mongoose.Types.Decimal128
    | string
    | number,
  right:
    | mongoose.Types.Decimal128
    | string
    | number,
): boolean {
  const leftParts =
    getDecimalParts(left);

  const rightParts =
    getDecimalParts(right);

  if (
    leftParts.coefficient === 0n &&
    rightParts.coefficient === 0n
  ) {
    return true;
  }

  if (
    leftParts.sign !==
      rightParts.sign ||
    leftParts.scale !==
      rightParts.scale
  ) {
    return false;
  }

  return (
    leftParts.coefficient ===
    rightParts.coefficient
  );
}

function isDuplicateKeyError(
  error: unknown,
): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code ===
      11000
  );
}

function isPaymentStatus(
  value: string,
): value is PaymentStatus {
  return (
    PAYMENT_STATUSES as readonly string[]
  ).includes(value);
}

function isChargeVerificationStatus(
  value: string,
): value is ChargeVerificationStatus {
  return (
    value === "pending" ||
    value === "processing" ||
    value === "successful" ||
    value === "failed" ||
    value === "cancelled" ||
    value === "expired"
  );
}

function buildPaymentMetadata(
  inputMetadata:
    | Record<string, string | number | boolean>
    | undefined,
  productMetadata:
    | Record<string, string | number | boolean>
    | undefined,
): Map<string, string> {
  const metadata =
    new Map<string, string>();

  for (const [key, value] of Object.entries(
    inputMetadata ?? {},
  )) {
    metadata.set(
      key,
      String(value),
    );
  }

  for (const [key, value] of Object.entries(
    productMetadata ?? {},
  )) {
    metadata.set(
      key,
      String(value),
    );
  }

  return metadata;
}

class PaymentService {
  constructor(
    private readonly provider: PaymentProvider,
  ) {}

  private async resolveProduct(
    input: CreatePaymentInput,
  ): Promise<ResolvedPaymentProduct> {
    const currency =
      normalizeCurrency(
        input.currency,
      );

    const productType: PaymentProductType =
      input.productType;

    if (
      !mongoose.isValidObjectId(
        input.productId,
      )
    ) {
      throw new Error(
        "Invalid payment product ID.",
      );
    }

    const productId =
      new mongoose.Types.ObjectId(
        input.productId,
      );

    if (
      productType ===
      "service"
    ) {
      const service =
        await Service.findOne({
          _id: productId,
          isActive: true,
        });

      if (!service) {
        throw new Error(
          "The selected service is unavailable.",
        );
      }

      const amount =
        service.pricing.get(
          currency,
        );

      if (!amount) {
        throw new Error(
          `The selected service is not available in ${currency}.`,
        );
      }

      return {
        type: "service",
        productId:
          service._id,
        name: service.name,
        currency,
        amount,
        metadata: {
          serviceType:
            service.type,
          ...(service.durationMinutes !==
            undefined && {
            durationMinutes:
              service.durationMinutes,
          }),
          ...(service.sessionCount !==
            undefined && {
            sessionCount:
              service.sessionCount,
          }),
        },
      };
    }

    if (
      productType ===
      "programme"
    ) {
      if (!input.optionId?.trim()) {
        throw new Error(
          "A programme pricing option is required.",
        );
      }

      const programme =
        await Programme.findOne({
          _id: productId,
          status: "published",
        });

      if (!programme) {
        throw new Error(
          "The selected programme is unavailable.",
        );
      }

      const optionCode =
        input.optionId
          .trim()
          .toLowerCase();

      const option =
        programme.pricingOptions.find(
          (item) =>
            item.code ===
              optionCode &&
            item.isActive,
        );

      if (!option) {
        throw new Error(
          "The selected programme pricing option is unavailable.",
        );
      }

      const now =
        new Date();

      if (
        option.availableFrom &&
        now <
          option.availableFrom
      ) {
        throw new Error(
          "The selected programme pricing option is not yet available.",
        );
      }

      if (
        option.availableUntil &&
        now >
          option.availableUntil
      ) {
        throw new Error(
          "The selected programme pricing option has expired.",
        );
      }

      const amount =
        option.pricing.get(
          currency,
        );

      if (!amount) {
        throw new Error(
          `The selected programme pricing option is not available in ${currency}.`,
        );
      }

      return {
        type: "programme",
        productId:
          programme._id,
        name:
          programme.title,
        optionId:
          option.code,
        optionName:
          option.name,
        currency,
        amount,
        metadata: {
          pricingType:
            option.code,
        },
      };
    }

    if (
      productType ===
      "workshop"
    ) {
      if (!input.optionId?.trim()) {
        throw new Error(
          "A workshop ticket type is required.",
        );
      }

      const workshop =
        await Workshop.findOne({
          _id: productId,
          status: "published",
        });

      if (!workshop) {
        throw new Error(
          "The selected workshop is unavailable.",
        );
      }

      if (
        !workshop.registrationRequired
      ) {
        throw new Error(
          "Registration is not required for this workshop.",
        );
      }

      const now =
        new Date();

      if (
        workshop.registrationDeadline &&
        now >
          workshop.registrationDeadline
      ) {
        throw new Error(
          "Registration for this workshop has closed.",
        );
      }

      const ticketCode =
        input.optionId
          .trim()
          .toLowerCase();

      const ticket =
        workshop.ticketTypes.find(
          (item) =>
            item.code ===
              ticketCode &&
            item.isActive,
        );

      if (!ticket) {
        throw new Error(
          "The selected workshop ticket is unavailable.",
        );
      }

      const amount =
        ticket.pricing.get(
          currency,
        );

      if (!amount) {
        throw new Error(
          `The selected workshop ticket is not available in ${currency}.`,
        );
      }

      return {
        type: "workshop",
        productId:
          workshop._id,
        name:
          workshop.title,
        optionId:
          ticket.code,
        optionName:
          ticket.name,
        currency,
        amount,
        metadata: {
          ticketCode:
            ticket.code,
          attendeeCount:
            ticket.attendeeCount,
        },
      };
    }

    throw new Error(
      `Unsupported payment product type: ${productType}.`,
    );
  }

  private async getCustomer(
    clientId: string,
  ): Promise<PaymentCustomer> {
    if (
      !mongoose.isValidObjectId(
        clientId,
      )
    ) {
      throw new Error(
        "Invalid client ID.",
      );
    }

    const client =
      await Client.findById(
        clientId,
      ).lean();

    if (!client) {
      throw new Error(
        "Client account was not found.",
      );
    }

    const user =
      await User.findById(
        client.userId,
      ).lean();

    if (!user) {
      throw new Error(
        "The user account associated with this client was not found.",
      );
    }

    const email =
      user.email
        ?.trim()
        .toLowerCase();

    if (!email) {
      throw new Error(
        "A valid client email address is required before payment can be initialized.",
      );
    }

    return {
      clientId:
        client._id,
      email,
      firstName:
        client.firstName.trim(),
      lastName:
        client.lastName.trim(),
      phone:
        client.phone?.trim() ||
        undefined,
    };
  }

  private async findExistingPayment(
    clientId: string,
    idempotencyKey: string,
  ) {
    return Payment.findOne({
      clientId,
      idempotencyKey,
    });
  }

  async createPayment(
    clientId: string,
    input: CreatePaymentInput,
  ) {
    if (
      !input.idempotencyKey?.trim()
    ) {
      throw new Error(
        "Payment idempotency key is required.",
      );
    }

    const idempotencyKey =
      input.idempotencyKey.trim();

    const existingPayment =
      await this.findExistingPayment(
        clientId,
        idempotencyKey,
      );

    if (existingPayment) {
      return existingPayment;
    }

    const customer =
      await this.getCustomer(
        clientId,
      );

    const product =
      await this.resolveProduct({
        ...input,
        idempotencyKey,
      });

    const metadata =
      buildPaymentMetadata(
        input.metadata,
        product.metadata,
      );

    const payment =
      new Payment({
        clientId:
          customer.clientId,

        reference:
          generatePaymentReference(),

        productType:
          product.type,

        productId:
          product.productId,

        optionId:
          product.optionId,

        productName:
          product.name,

        optionName:
          product.optionName,

        amount:
          product.amount,

        currency:
          product.currency,

        status:
          "pending",

        idempotencyKey,

        metadata,
      });

    try {
      await payment.save();
    } catch (error) {
      if (
        !isDuplicateKeyError(
          error,
        )
      ) {
        throw error;
      }

      const duplicatePayment =
        await this.findExistingPayment(
          clientId,
          idempotencyKey,
        );

      if (duplicatePayment) {
        return duplicatePayment;
      }

      throw error;
    }

    try {
      const providerResult =
        await this.provider.initialize({
          reference:
            payment.reference,

          amount:
            payment.amount,

          currency:
            payment.currency,

          customer: {
            email:
              customer.email,

            firstName:
              customer.firstName,

            lastName:
              customer.lastName,

            phone:
              customer.phone,
          },

          metadata: {
            paymentReference:
              payment.reference,

            productType:
              product.type,

            productId:
              product.productId.toString(),

            ...(product.optionId && {
              optionId:
                product.optionId,
            }),

            ...Object.fromEntries(
              metadata.entries(),
            ),
          },

          redirectUrl:
            getPaymentRedirectUrl(),
        });

      payment.providerReference =
        providerResult.providerReference;

      payment.checkoutUrl =
        providerResult.checkoutUrl;

      if (
        providerResult.status ===
        "pending"
      ) {
        transitionPaymentStatus(
          payment,
          "pending",
        );
      } else {
        transitionPaymentStatus(
          payment,
          "processing",
        );
      }

      await payment.save();

      return payment;
    } catch (error) {
      if (
        error instanceof
        KoraRateLimitError
      ) {
        throw error;
      }

      if (
        canTransitionPaymentStatus(
          payment.status,
          "failed",
        )
      ) {
        transitionPaymentStatus(
          payment,
          "failed",
        );
      } else {
        payment.status =
          "failed";

        payment.failedAt =
          new Date();
      }

      payment.failureReason =
        error instanceof Error
          ? error.message
          : "Payment initialization failed.";

      await payment.save();

      throw error;
    }
  }

  async verifyPayment(
    reference: string,
  ) {
    const normalizedReference =
      reference.trim();

    if (!normalizedReference) {
      throw new Error(
        "Payment reference is required.",
      );
    }

    const payment =
      await Payment.findOne({
        reference:
          normalizedReference,
      });

    if (!payment) {
      throw new Error(
        "Payment was not found.",
      );
    }

    if (
      payment.status ===
      "successful"
    ) {
      await paymentFulfilmentService.fulfilPayment(
        payment._id,
      );

      return payment;
    }

    if (
      payment.status ===
      "refunded"
    ) {
      return payment;
    }

    if (!payment.providerReference) {
      throw new Error(
        "Payment does not have a provider reference.",
      );
    }

    const verification =
      await this.provider.verify(
        payment.providerReference,
      );

    this.validateVerification(
      payment.amount,
      payment.currency,
      verification,
    );

    this.applyVerificationStatus(
      payment,
      verification,
    );

    await payment.save();

    if (
      verification.status ===
      "successful"
    ) {
      await paymentFulfilmentService.fulfilPayment(
        payment._id,
      );
    }

    return payment;
  }

  private validateVerification(
    expectedAmount:
      mongoose.Types.Decimal128,
    expectedCurrency: Currency,
    verification:
      PaymentProviderVerificationResult,
  ): void {
    if (
      verification.currency &&
      verification.currency !==
        expectedCurrency
    ) {
      throw new Error(
        "Payment currency does not match the original payment.",
      );
    }

    if (
      verification.amount &&
      !decimalsEqual(
        expectedAmount,
        verification.amount,
      )
    ) {
      throw new Error(
        "Payment amount does not match the original payment.",
      );
    }

    if (
      verification.status ===
        "successful" &&
      verification.amountPaid &&
      !decimalsEqual(
        expectedAmount,
        verification.amountPaid,
      )
    ) {
      throw new Error(
        "The amount paid does not match the original payment.",
      );
    }
  }

  private applyVerificationStatus(
    payment: {
      status: PaymentStatus;
      paidAt?: Date;
      failedAt?: Date;
      cancelledAt?: Date;
      expiredAt?: Date;
      failureReason?: string;
    },
    verification:
      PaymentProviderVerificationResult,
  ): void {
    const status =
      verification.status;

    if (
      !isChargeVerificationStatus(
        status,
      )
    ) {
      throw new Error(
        `Unsupported payment verification status: ${status}.`,
      );
    }

    if (
      !canTransitionPaymentStatus(
        payment.status,
        status,
      )
    ) {
      throw new Error(
        `Invalid payment status transition: ${payment.status} -> ${status}.`,
      );
    }

    switch (status) {
      case "successful":
        transitionPaymentStatus(
          payment,
          "successful",
        );

        payment.paidAt =
          payment.paidAt ??
          new Date();

        payment.failureReason =
          undefined;

        break;

      case "failed":
        transitionPaymentStatus(
          payment,
          "failed",
        );

        payment.failedAt =
          payment.failedAt ??
          new Date();

        break;

      case "cancelled":
        transitionPaymentStatus(
          payment,
          "cancelled",
        );

        payment.cancelledAt =
          payment.cancelledAt ??
          new Date();

        break;

      case "expired":
        transitionPaymentStatus(
          payment,
          "expired",
        );

        payment.expiredAt =
          payment.expiredAt ??
          new Date();

        break;

      case "processing":
        transitionPaymentStatus(
          payment,
          "processing",
        );

        break;

      case "pending":
        transitionPaymentStatus(
          payment,
          "pending",
        );

        break;
    }
  }

  async getPaymentByReference(
    clientId: string,
    reference: string,
  ) {
    if (
      !mongoose.isValidObjectId(
        clientId,
      )
    ) {
      throw new Error(
        "Invalid client ID.",
      );
    }

    const normalizedReference =
      reference.trim();

    if (!normalizedReference) {
      throw new Error(
        "Payment reference is required.",
      );
    }

    return Payment.findOne({
      clientId,
      reference:
        normalizedReference,
    });
  }

  async getPaymentByIdForClient(
    clientId: string,
    paymentId: string,
  ) {
    if (
      !mongoose.isValidObjectId(
        clientId,
      )
    ) {
      throw new Error(
        "Invalid client ID.",
      );
    }

    if (
      !mongoose.isValidObjectId(
        paymentId,
      )
    ) {
      throw new Error(
        "Invalid payment ID.",
      );
    }

    return Payment.findOne({
      _id: paymentId,
      clientId,
    });
  }

  async getMyPayments(
    clientId: string,
    options?: {
      status?: PaymentStatus;
      limit?: number;
      skip?: number;
    },
  ) {
    if (
      !mongoose.isValidObjectId(
        clientId,
      )
    ) {
      throw new Error(
        "Invalid client ID.",
      );
    }

    const limit =
      Math.min(
        Math.max(
          options?.limit ?? 20,
          1,
        ),
        100,
      );

    const skip =
      Math.max(
        options?.skip ?? 0,
        0,
      );

    const query: {
      clientId:
        mongoose.Types.ObjectId;
      status?: PaymentStatus;
    } = {
      clientId:
        new mongoose.Types.ObjectId(
          clientId,
        ),
    };

    if (
      options?.status &&
      isPaymentStatus(
        options.status,
      )
    ) {
      query.status =
        options.status;
    }

    return Payment.find(query)
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit);
  }

  async getAdminPayments(
    options?: {
      status?: PaymentStatus;
      limit?: number;
      skip?: number;
    },
  ) {
    const limit =
      Math.min(
        Math.max(
          options?.limit ?? 20,
          1,
        ),
        100,
      );

    const skip =
      Math.max(
        options?.skip ?? 0,
        0,
      );

    const query: {
      status?: PaymentStatus;
    } = {};

    if (
      options?.status &&
      isPaymentStatus(
        options.status,
      )
    ) {
      query.status =
        options.status;
    }

    const [
      payments,
      total,
    ] = await Promise.all([
      Payment.find(query)
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit),

      Payment.countDocuments(
        query,
      ),
    ]);

    return {
      payments,
      total,
      limit,
      skip,
    };
  }
}

export const paymentService =
  new PaymentService(
    createPaymentProvider(),
  );