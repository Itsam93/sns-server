import mongoose from "mongoose";

import type {
  PaymentProviderInitializeInput,
  PaymentProviderInitializeResult,
  PaymentProviderRefundInput,
  PaymentProviderRefundResult,
  PaymentProviderVerificationResult,
} from "../types/payment.js";

import type { PaymentProvider } from "./PaymentProvider.js";

const KORA_BASE_URL =
  "https://api.korapay.com/merchant/api/v1";

const KORA_INITIALIZE_PATH =
  "/charges/initialize";

const KORA_VERIFY_PATH =
  "/charges";

const KORA_REFUND_INITIALIZE_PATH =
  "/refunds/initiate";

const KORA_REFUND_PATH =
  "/refunds";

interface KoraInitializeResponse {
  status: boolean;
  message?: string;
  data?: {
    reference?: string;
    checkout_url?: string;
  };
}

interface KoraVerifyResponse {
  status: boolean;
  message?: string;
  data?: {
    reference?: string;
    status?: string;
    amount?: number | string;
    amount_paid?: number | string;
    currency?: string;
  };
}

interface KoraRefundResponse {
  status: boolean;
  message?: string;
  data?: {
    refund_reference?: string;
    reference?: string;
    payment_reference?: string;
    status?: string;
    amount_returned?: number | string;
    amount?: number | string;
    currency?: string;
    reason?: string;
    refund_date?: string;
    completion_date?: string;
    completed_at?: string;
  };
}

export class KoraRateLimitError extends Error {
  readonly statusCode = 429;

  readonly retryAfterSeconds?: number;

  constructor(
    message = "Kora temporarily rate-limited this request.",
    retryAfterSeconds?: number,
  ) {
    super(message);

    this.name = "KoraRateLimitError";

    this.retryAfterSeconds =
      retryAfterSeconds;

    Object.setPrototypeOf(
      this,
      KoraRateLimitError.prototype,
    );
  }
}

function getKoraSecretKey(): string {
  const secretKey =
    process.env.KORA_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new Error(
      "KORA_SECRET_KEY is not configured.",
    );
  }

  return secretKey;
}

function createHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${getKoraSecretKey()}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

function toDecimal128(
  value: number | string,
): mongoose.Types.Decimal128 {
  return mongoose.Types.Decimal128.fromString(
    String(value),
  );
}

function normalizeCurrency(
  value: string | undefined,
): PaymentProviderVerificationResult["currency"] {
  if (
    value === "NGN" ||
    value === "USD" ||
    value === "GBP"
  ) {
    return value;
  }

  return undefined;
}

function normalizeRefundCurrency(
  value: string | undefined,
): PaymentProviderRefundResult["currency"] {
  if (
    value === "NGN" ||
    value === "USD" ||
    value === "GBP"
  ) {
    return value;
  }

  return undefined;
}

function mapKoraStatus(
  status: string | undefined,
): PaymentProviderVerificationResult["status"] {
  switch (status?.trim().toLowerCase()) {
    case "success":
    case "successful":
      return "successful";

    case "failed":
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
      return "pending";
  }
}

function mapKoraRefundStatus(
  status: string | undefined,
): PaymentProviderRefundResult["status"] {
  switch (status?.trim().toLowerCase()) {
    case "success":
    case "successful":
      return "successful";

    case "failed":
      return "failed";

    case "processing":
    case "pending":
      return "processing";

    default:
      return "processing";
  }
}

function getRefundReference(
  data: KoraRefundResponse["data"],
  fallback: string,
): string {
  return (
    data?.refund_reference?.trim() ||
    data?.reference?.trim() ||
    fallback
  );
}

function getRefundAmount(
  data: KoraRefundResponse["data"],
): mongoose.Types.Decimal128 | undefined {
  const value =
    data?.amount_returned ??
    data?.amount;

  if (value === undefined) {
    return undefined;
  }

  return toDecimal128(value);
}

function buildKoraMetadata(
  input: PaymentProviderInitializeInput,
): Record<string, string> {
  const metadata: Record<string, string> = {};

  const paymentReference =
    input.metadata?.paymentReference;

  const productType =
    input.metadata?.productType;

  const productId =
    input.metadata?.productId;

  const optionId =
    input.metadata?.optionId;

  if (
    typeof paymentReference === "string" &&
    paymentReference.trim()
  ) {
    metadata.paymentReference =
      paymentReference.trim();
  }

  if (
    typeof productType === "string" &&
    productType.trim()
  ) {
    metadata.productType =
      productType.trim();
  }

  if (
    typeof productId === "string" &&
    productId.trim()
  ) {
    metadata.productId =
      productId.trim();
  }

  if (
    typeof optionId === "string" &&
    optionId.trim()
  ) {
    metadata.optionId =
      optionId.trim();
  }

  return metadata;
}

function getRetryAfterSeconds(
  response: Response,
): number | undefined {
  const retryAfter =
    response.headers.get("retry-after")?.trim();

  if (!retryAfter) {
    return undefined;
  }

  const seconds = Number(retryAfter);

  if (
    Number.isFinite(seconds) &&
    seconds >= 0
  ) {
    return Math.ceil(seconds);
  }

  const retryDate =
    Date.parse(retryAfter);

  if (Number.isNaN(retryDate)) {
    return undefined;
  }

  const delay =
    Math.ceil(
      (retryDate - Date.now()) / 1000,
    );

  return Math.max(delay, 0);
}

async function parseResponse<T>(
  response: Response,
): Promise<T | undefined> {
  try {
    return (await response.json()) as T;
  } catch {
    return undefined;
  }
}

function throwIfRateLimited(
  response: Response,
  result:
    | KoraInitializeResponse
    | KoraVerifyResponse
    | KoraRefundResponse
    | undefined,
): void {
  if (response.status !== 429) {
    return;
  }

  throw new KoraRateLimitError(
    result?.message ||
      "Kora temporarily rate-limited this request. Please try again shortly.",
    getRetryAfterSeconds(response),
  );
}

export class KoraProvider
  implements PaymentProvider
{
  readonly name = "korapay";

  async initialize(
    input: PaymentProviderInitializeInput,
  ): Promise<
    PaymentProviderInitializeResult
  > {
    const customerName =
      [
        input.customer.firstName?.trim(),
        input.customer.lastName?.trim(),
      ]
        .filter(Boolean)
        .join(" ");

    const payload = {
      reference: input.reference,
      amount: Number(input.amount.toString()),
      currency: input.currency,
      customer: {
        email: input.customer.email,
        ...(customerName && {
          name: customerName,
        }),
      },
      metadata: buildKoraMetadata(input),
      redirect_url: input.redirectUrl,
    };

    const response =
      await fetch(
        `${KORA_BASE_URL}${KORA_INITIALIZE_PATH}`,
        {
          method: "POST",
          headers: createHeaders(),
          body: JSON.stringify(payload),
        },
      );

    const result =
      await parseResponse<KoraInitializeResponse>(
        response,
      );

    throwIfRateLimited(
      response,
      result,
    );

    if (!result) {
      throw new Error(
        `Kora returned an invalid response (${response.status}).`,
      );
    }

    if (
      !response.ok ||
      !result.status ||
      !result.data?.reference ||
      !result.data.checkout_url
    ) {
      throw new Error(
        result.message ||
          `Kora checkout initialization failed (${response.status}).`,
      );
    }

    return {
      providerReference:
        result.data.reference,

      checkoutUrl:
        result.data.checkout_url,

      status: "pending",

      raw: result,
    };
  }

  async verify(
    providerReference: string,
  ): Promise<
    PaymentProviderVerificationResult
  > {
    const normalizedReference =
      providerReference.trim();

    if (!normalizedReference) {
      throw new Error(
        "Provider reference is required for verification.",
      );
    }

    const response =
      await fetch(
        `${KORA_BASE_URL}${KORA_VERIFY_PATH}/${encodeURIComponent(
          normalizedReference,
        )}`,
        {
          method: "GET",
          headers: createHeaders(),
        },
      );

    const result =
      await parseResponse<KoraVerifyResponse>(
        response,
      );

    throwIfRateLimited(
      response,
      result,
    );

    if (!result) {
      throw new Error(
        `Kora returned an invalid verification response (${response.status}).`,
      );
    }

    if (
      !response.ok ||
      !result.status ||
      !result.data
    ) {
      throw new Error(
        result.message ||
          `Kora charge verification failed (${response.status}).`,
      );
    }

    const data = result.data;

    return {
      providerReference:
        data.reference ||
        normalizedReference,

      status: mapKoraStatus(
        data.status,
      ),

      amount:
        data.amount !== undefined
          ? toDecimal128(data.amount)
          : undefined,

      amountPaid:
        data.amount_paid !== undefined
          ? toDecimal128(
              data.amount_paid,
            )
          : undefined,

      currency:
        normalizeCurrency(
          data.currency,
        ),

      raw: result,
    };
  }

  async refund(
    input: PaymentProviderRefundInput,
  ): Promise<
    PaymentProviderRefundResult
  > {
    if (!input.paymentReference.trim()) {
      throw new Error(
        "Payment reference is required for a refund.",
      );
    }

    if (!input.refundReference.trim()) {
      throw new Error(
        "Refund reference is required.",
      );
    }

    const response =
      await fetch(
        `${KORA_BASE_URL}${KORA_REFUND_INITIALIZE_PATH}`,
        {
          method: "POST",
          headers: createHeaders(),
          body: JSON.stringify({
            payment_reference:
              input.paymentReference,

            reference:
              input.refundReference,

            amount: Number(
              input.amount.toString(),
            ),

            reason: input.reason,

            webhook_url:
              input.webhookUrl,
          }),
        },
      );

    const result =
      await parseResponse<KoraRefundResponse>(
        response,
      );

    throwIfRateLimited(
      response,
      result,
    );

    if (!result) {
      throw new Error(
        `Kora returned an invalid refund response (${response.status}).`,
      );
    }

    if (
      !response.ok ||
      !result.status ||
      !result.data
    ) {
      throw new Error(
        result.message ||
          `Kora refund initialization failed (${response.status}).`,
      );
    }

    const data = result.data;

    return {
      providerReference:
        getRefundReference(
          data,
          input.refundReference,
        ),

      status:
        mapKoraRefundStatus(
          data.status,
        ),

      amount:
        getRefundAmount(data) ??
        input.amount,

      currency:
        normalizeRefundCurrency(
          data.currency,
        ) ?? input.currency,

      raw: result,
    };
  }

  async getRefund(
    providerReference: string,
  ): Promise<
    PaymentProviderRefundResult
  > {
    const normalizedReference =
      providerReference.trim();

    if (!normalizedReference) {
      throw new Error(
        "Refund reference is required.",
      );
    }

    const response =
      await fetch(
        `${KORA_BASE_URL}${KORA_REFUND_PATH}/${encodeURIComponent(
          normalizedReference,
        )}`,
        {
          method: "GET",
          headers: createHeaders(),
          },
      );

    const result =
      await parseResponse<KoraRefundResponse>(
        response,
      );

    throwIfRateLimited(
      response,
      result,
    );

    if (!result) {
      throw new Error(
        `Kora returned an invalid refund verification response (${response.status}).`,
      );
    }

    if (
      !response.ok ||
      !result.status ||
      !result.data
    ) {
      throw new Error(
        result.message ||
          `Kora refund verification failed (${response.status}).`,
      );
    }

    const data = result.data;

    return {
      providerReference:
        getRefundReference(
          data,
          normalizedReference,
        ),

      status:
        mapKoraRefundStatus(
          data.status,
        ),

      amount:
        getRefundAmount(data),

      currency:
        normalizeRefundCurrency(
          data.currency,
        ),

      raw: result,
    };
  }
}

export const koraProvider =
  new KoraProvider();