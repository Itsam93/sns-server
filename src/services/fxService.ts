import crypto from "node:crypto";

const DEFAULT_KORA_API_URL =
  "https://api.korapay.com/merchant/api/v1";

const DEFAULT_TIMEOUT_MS = 15_000;

const CURRENCY_CODE_REGEX = /^[A-Z]{3}$/;
const POSITIVE_DECIMAL_REGEX =
  /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const MONEY_REGEX =
  /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;

export interface CreateFxQuoteInput {
  sourceCurrency: string;
  targetCurrency: string;
  amount: string;
  reference?: string;
}

export interface FxQuote {
  sourceCurrency: string;
  targetCurrency: string;
  sourceAmount: string;
  targetAmount: string;
  rate: string;
  source: "kora";
  quotedAt: Date;
  expiresAt: Date;
  reference: string;
}

interface KoraFxRateData {
  from_currency?: string;
  to_currency?: string;
  from_amount?: number | string;
  to_amount?: number | string;
  rate?: number | string;
  reference?: string;
  expiry_in_seconds?: number;
  expiry_date?: string;
}

interface KoraFxRateResponse {
  status?: boolean;
  message?: string;
  data?: KoraFxRateData;
}

class FxServiceError extends Error {
  statusCode: number;
  code: string;

  constructor(
    message: string,
    statusCode = 500,
    code = "FX_SERVICE_ERROR",
  ) {
    super(message);
    this.name = "FxServiceError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

function getSecretKey(): string {
  const secretKey =
    process.env.KORA_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new FxServiceError(
      "Kora secret key is not configured.",
      500,
      "KORA_SECRET_KEY_MISSING",
    );
  }

  return secretKey;
}

function getApiUrl(): string {
  const configured =
    process.env.KORA_API_URL?.trim();

  return (
    configured || DEFAULT_KORA_API_URL
  ).replace(/\/+$/, "");
}

function getTimeoutMs(): number {
  const configured =
    Number(process.env.KORA_API_TIMEOUT_MS);

  if (
    Number.isInteger(configured) &&
    configured >= 1_000 &&
    configured <= 120_000
  ) {
    return configured;
  }

  return DEFAULT_TIMEOUT_MS;
}

function normalizeCurrency(
  value: string,
  fieldName: string,
): string {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new FxServiceError(
      `${fieldName} is required.`,
      400,
      "INVALID_CURRENCY",
    );
  }

  const currency =
    value.trim().toUpperCase();

  if (
    !CURRENCY_CODE_REGEX.test(currency)
  ) {
    throw new FxServiceError(
      `${fieldName} must be a valid 3-letter ISO 4217 currency code.`,
      400,
      "INVALID_CURRENCY",
    );
  }

  return currency;
}

function normalizeAmount(
  value: string,
): string {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new FxServiceError(
      "FX amount is required.",
      400,
      "INVALID_FX_AMOUNT",
    );
  }

  const amount = value.trim();

  if (!MONEY_REGEX.test(amount)) {
    throw new FxServiceError(
      "FX amount must be a positive decimal amount with no more than 2 decimal places.",
      400,
      "INVALID_FX_AMOUNT",
    );
  }

  const numericAmount = Number(amount);

  if (
    !Number.isFinite(numericAmount) ||
    numericAmount <= 0
  ) {
    throw new FxServiceError(
      "FX amount must be greater than zero.",
      400,
      "INVALID_FX_AMOUNT",
    );
  }

  return amount;
}

function normalizeReference(
  reference?: string,
): string {
  const value = reference?.trim();

  if (value) {
    if (value.length > 200) {
      throw new FxServiceError(
        "FX reference cannot exceed 200 characters.",
        400,
        "INVALID_FX_REFERENCE",
      );
    }

    return value;
  }

  return `SNS-FX-${crypto.randomUUID()}`;
}

function parsePositiveDecimal(
  value: number | string | undefined,
  fieldName: string,
): string {
  if (
    value === undefined ||
    value === null
  ) {
    throw new FxServiceError(
      `Kora FX response is missing ${fieldName}.`,
      502,
      "INVALID_KORA_FX_RESPONSE",
    );
  }

  const normalized =
    String(value).trim();

  if (
    !normalized ||
    !POSITIVE_DECIMAL_REGEX.test(
      normalized,
    )
  ) {
    throw new FxServiceError(
      `Kora returned an invalid ${fieldName}.`,
      502,
      "INVALID_KORA_FX_RESPONSE",
    );
  }

  const numericValue =
    Number(normalized);

  if (
    !Number.isFinite(numericValue) ||
    numericValue <= 0
  ) {
    throw new FxServiceError(
      `Kora returned an invalid ${fieldName}.`,
      502,
      "INVALID_KORA_FX_RESPONSE",
    );
  }

  return normalized;
}

function parseExpiry(
  data: KoraFxRateData,
  quotedAt: Date,
): Date {
  if (data.expiry_date) {
    const expiryDate =
      new Date(data.expiry_date);

    if (
      !Number.isNaN(
        expiryDate.getTime(),
      )
    ) {
      if (expiryDate <= quotedAt) {
        throw new FxServiceError(
          "Kora returned an expired FX quote.",
          502,
          "INVALID_KORA_FX_EXPIRY",
        );
      }

      return expiryDate;
    }
  }

  if (
    data.expiry_in_seconds !==
      undefined &&
    Number.isFinite(
      data.expiry_in_seconds,
    ) &&
    data.expiry_in_seconds > 0
  ) {
    return new Date(
      quotedAt.getTime() +
        data.expiry_in_seconds * 1000,
    );
  }

  throw new FxServiceError(
    "Kora FX response is missing quote expiry information.",
    502,
    "INVALID_KORA_FX_EXPIRY",
  );
}

async function request<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const controller =
    new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    getTimeoutMs(),
  );

  try {
    const response = await fetch(
      `${getApiUrl()}${path}`,
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${getSecretKey()}`,
          Accept: "application/json",
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      },
    );

    const rawBody =
      await response.text();

    let parsedBody: unknown;

    try {
      parsedBody = rawBody
        ? JSON.parse(rawBody)
        : undefined;
    } catch {
      throw new FxServiceError(
        "Kora returned an invalid JSON response.",
        502,
        "INVALID_KORA_RESPONSE",
      );
    }

    if (!response.ok) {
      const message =
        parsedBody &&
        typeof parsedBody === "object" &&
        "message" in parsedBody &&
        typeof (
          parsedBody as {
            message?: unknown;
          }
        ).message === "string"
          ? (
              parsedBody as {
                message: string;
              }
            ).message
          : "Kora FX request failed.";

      throw new FxServiceError(
        message,
        response.status >= 500
          ? 502
          : response.status,
        "KORA_FX_REQUEST_FAILED",
      );
    }

    return parsedBody as T;
  } catch (error) {
    if (
      error instanceof FxServiceError
    ) {
      throw error;
    }

    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw new FxServiceError(
        "Kora FX request timed out.",
        504,
        "KORA_FX_TIMEOUT",
      );
    }

    throw new FxServiceError(
      "Unable to communicate with Kora for the FX quote.",
      502,
      "KORA_FX_REQUEST_FAILED",
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function createFxQuote(
  input: CreateFxQuoteInput,
): Promise<FxQuote> {
  if (
    !input ||
    typeof input !== "object"
  ) {
    throw new FxServiceError(
      "FX quote request is required.",
      400,
      "INVALID_FX_REQUEST",
    );
  }

  const sourceCurrency =
    normalizeCurrency(
      input.sourceCurrency,
      "Source currency",
    );

  const targetCurrency =
    normalizeCurrency(
      input.targetCurrency,
      "Target currency",
    );

  const amount =
    normalizeAmount(input.amount);

  const reference =
    normalizeReference(input.reference);

  if (
    sourceCurrency === targetCurrency
  ) {
    const quotedAt =
      new Date();

    const expiresAt =
      new Date(
        quotedAt.getTime() +
          5 * 60 * 1000,
      );

    return {
      sourceCurrency,
      targetCurrency,
      sourceAmount: amount,
      targetAmount: amount,
      rate: "1",
      source: "kora",
      quotedAt,
      expiresAt,
      reference,
    };
  }

  const quotedAt =
    new Date();

  const response =
    await request<KoraFxRateResponse>(
      "/conversions/rates",
      {
        amount: Number(amount),
        from_currency:
          sourceCurrency,
        to_currency:
          targetCurrency,
        reference,
      },
    );

  if (
    response.status !== true ||
    !response.data
  ) {
    throw new FxServiceError(
      response.message ||
        "Kora could not provide an FX quote.",
      502,
      "KORA_FX_QUOTE_FAILED",
    );
  }

  const data =
    response.data;

  const responseSourceCurrency =
    normalizeCurrency(
      data.from_currency ?? "",
      "Kora source currency",
    );

  const responseTargetCurrency =
    normalizeCurrency(
      data.to_currency ?? "",
      "Kora target currency",
    );

  if (
    responseSourceCurrency !==
      sourceCurrency ||
    responseTargetCurrency !==
      targetCurrency
  ) {
    throw new FxServiceError(
      "Kora returned an FX quote for an unexpected currency pair.",
      502,
      "KORA_FX_CURRENCY_MISMATCH",
    );
  }

  const sourceAmount =
    parsePositiveDecimal(
      data.from_amount,
      "source amount",
    );

  const targetAmount =
    parsePositiveDecimal(
      data.to_amount,
      "target amount",
    );

  const rate =
    parsePositiveDecimal(
      data.rate,
      "exchange rate",
    );

  const numericSourceAmount =
    Number(sourceAmount);

  const numericRequestedAmount =
    Number(amount);

  if (
    !Number.isFinite(
      numericSourceAmount,
    ) ||
    Math.abs(
      numericSourceAmount -
        numericRequestedAmount,
    ) > 0.01
  ) {
    throw new FxServiceError(
      "Kora returned an FX quote for an unexpected source amount.",
      502,
      "KORA_FX_AMOUNT_MISMATCH",
    );
  }

  const expiresAt =
    parseExpiry(
      data,
      quotedAt,
    );

  return {
    sourceCurrency,
    targetCurrency,
    sourceAmount,
    targetAmount,
    rate,
    source: "kora",
    quotedAt,
    expiresAt,
    reference:
      typeof data.reference ===
        "string" &&
      data.reference.trim()
        ? data.reference.trim()
        : reference,
  };
}