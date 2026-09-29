import type mongoose from "mongoose";

import type { Currency } from "../config/currencies.js";

export type PaymentProductType =
  | "service"
  | "programme"
  | "workshop";

export type PaymentStatus =
  | "pending"
  | "processing"
  | "successful"
  | "failed"
  | "cancelled"
  | "expired"
  | "refunded";

export type PaymentAttemptStatus =
  | "created"
  | "redirected"
  | "processing"
  | "successful"
  | "failed"
  | "cancelled"
  | "expired";

export type PaymentRefundStatus =
  | "processing"
  | "successful"
  | "failed";

export type PaymentEventStatus =
  | "received"
  | "processed"
  | "ignored"
  | "failed";

export interface PaymentProductReference {
  type: PaymentProductType;
  productId: mongoose.Types.ObjectId;
  optionId?: string;
}

export interface ResolvedPaymentProduct {
  type: PaymentProductType;
  productId: mongoose.Types.ObjectId;

  name: string;

  optionId?: string;
  optionName?: string;

  currency: Currency;
  amount: mongoose.Types.Decimal128;

  metadata?: Record<
    string,
    string | number | boolean
  >;
}

export interface CreatePaymentInput {
  productType: PaymentProductType;
  productId: string;

  currency: Currency;

  optionId?: string;

  idempotencyKey: string;

  metadata?: Record<
    string,
    string | number | boolean
  >;
}

export interface PaymentCustomer {
  clientId: mongoose.Types.ObjectId;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface PaymentProviderInitializeInput {
  reference: string;

  amount: mongoose.Types.Decimal128;
  currency: Currency;

  customer: {
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };

  metadata?: Record<
    string,
    string | number | boolean
  >;

  redirectUrl: string;
}

export interface PaymentProviderInitializeResult {
  providerReference: string;
  checkoutUrl: string;
  status: "pending";
  raw?: unknown;
}

export interface PaymentProviderVerificationResult {
  providerReference: string;

  status:
    | "pending"
    | "processing"
    | "successful"
    | "failed"
    | "cancelled"
    | "expired"
    | "refunded";

  amount?: mongoose.Types.Decimal128;
  amountPaid?: mongoose.Types.Decimal128;
  currency?: Currency;

  raw?: unknown;
}

export interface PaymentProviderRefundInput {
  paymentReference: string;

  refundReference: string;

  amount: mongoose.Types.Decimal128;
  currency: Currency;

  reason?: string;

  webhookUrl?: string;
}

export interface PaymentProviderRefundResult {
  providerReference: string;

  status: PaymentRefundStatus;

  amount?: mongoose.Types.Decimal128;
  currency?: Currency;

  raw?: unknown;
}

export interface PaymentProviderWebhookEvent {
  provider: string;
  eventId: string;
  eventType: string;

  providerReference?: string;

  status:
    | "successful"
    | "failed"
    | "pending"
    | "processing"
    | "cancelled"
    | "expired"
    | "refunded";

  amount?: mongoose.Types.Decimal128;
  amountPaid?: mongoose.Types.Decimal128;
  currency?: Currency;

  payload: unknown;
}

export interface PaymentProvider {
  readonly name: string;

  initialize(
    input: PaymentProviderInitializeInput,
  ): Promise<PaymentProviderInitializeResult>;

  verify(
    providerReference: string,
  ): Promise<PaymentProviderVerificationResult>;

  refund(
    input: PaymentProviderRefundInput,
  ): Promise<PaymentProviderRefundResult>;

  getRefund(
    providerReference: string,
  ): Promise<PaymentProviderRefundResult>;
}