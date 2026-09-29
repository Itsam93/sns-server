import { Decimal } from "decimal.js";

import { AppError } from "../utils/appError.js";

const DEFAULT_API_URL =
  "https://api.flutterwave.com/v3";

const DEFAULT_TIMEOUT_MS = 10000;

const MAX_TRANSACTION_REFERENCE_LENGTH = 100;

const MAX_TRANSACTION_ID_LENGTH = 100;

const MAX_AMOUNT_DECIMAL_PLACES = 2;

const MAX_META_KEYS = 50;

const MAX_META_KEY_LENGTH = 100;

const MAX_META_VALUE_LENGTH = 500;

const FLUTTERWAVE_API_HOST =
  "api.flutterwave.com";

const FLUTTERWAVE_API_PATH =
  "/v3";

export type FlutterwaveCurrency =
  | "USD"
  | "NGN";

export interface FlutterwaveCustomer {
  email: string;
  name?: string;
  phoneNumber?: string;
}

export interface FlutterwaveCustomization {
  title?: string;
  description?: string;
}

export interface FlutterwaveConfigurations {
  session_duration?: number;
  max_retry_attempt?: number;
}

export interface InitializeFlutterwavePaymentInput {
  transactionReference: string;
  amount: string;
  currency: FlutterwaveCurrency;
  redirectUrl: string;
  customer: FlutterwaveCustomer;
  paymentOptions?: string;
  customization?: FlutterwaveCustomization;
  configurations?: FlutterwaveConfigurations;
  meta?: Record<
    string,
    string | number | boolean | null
  >;
}

export interface FlutterwaveInitializePaymentResult {
  status: string;
  message: string;
  data: {
    link: string;
  };
}

export interface FlutterwaveTransactionCustomer {
  id?: number | string;
  name?: string;
  phone_number?: string;
  email?: string;
  created_at?: string;
}

export interface FlutterwaveTransactionData {
  id: number | string;
  tx_ref: string;
  flw_ref?: string;
  amount: number | string;
  currency: string;
  charged_amount?: number | string;
  amount_settled?: number | string;
  status: string;
  payment_type?: string;
  processor_response?: string;
  created_at?: string;
  customer?: FlutterwaveTransactionCustomer;
}

export interface FlutterwaveVerifyTransactionResult {
  status: string;
  message: string;
  data: FlutterwaveTransactionData | null;
}

function getSecretKey(): string {
  const secretKey =
    process.env.FLUTTERWAVE_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new AppError(
      "Flutterwave secret key is not configured.",
      500,
    );
  }

  return secretKey;
}

function getApiUrl(): string {
  const configuredUrl =
    process.env.FLUTTERWAVE_API_URL?.trim();

  const apiUrl =
    configuredUrl || DEFAULT_API_URL;

  const normalizedUrl =
    apiUrl.replace(/\/+$/, "");

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(normalizedUrl);
  } catch {
    throw new AppError(
      "Flutterwave API URL is invalid.",
      500,
    );
  }

  if (parsedUrl.protocol !== "https:") {
    throw new AppError(
      "Flutterwave API URL must use HTTPS.",
      500,
    );
  }

  if (
    parsedUrl.hostname.toLowerCase() !==
    FLUTTERWAVE_API_HOST
  ) {
    throw new AppError(
      "Flutterwave API URL must use the official Flutterwave API host.",
      500,
    );
  }

  if (
    parsedUrl.username ||
    parsedUrl.password
  ) {
    throw new AppError(
      "Flutterwave API URL must not contain credentials.",
      500,
    );
  }

  if (
    parsedUrl.search ||
    parsedUrl.hash
  ) {
    throw new AppError(
      "Flutterwave API URL must not contain query parameters or fragments.",
      500,
    );
  }

  if (
    parsedUrl.pathname !==
    FLUTTERWAVE_API_PATH
  ) {
    throw new AppError(
      "Flutterwave API URL must use the Flutterwave v3 API path.",
      500,
    );
  }

  return normalizedUrl;
}

function getTimeoutMs(): number {
  const configured = Number(
    process.env.FLUTTERWAVE_API_TIMEOUT_MS,
  );

  if (
    Number.isFinite(configured) &&
    configured >= 1000 &&
    configured <= 30000
  ) {
    return Math.floor(configured);
  }

  return DEFAULT_TIMEOUT_MS;
}

function createTimeoutController(): {
  controller: AbortController;
  timeout: ReturnType<typeof setTimeout>;
} {
  const controller =
    new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, getTimeoutMs());

  return {
    controller,
    timeout,
  };
}

async function parseResponseBody(
  response: Response,
): Promise<unknown> {
  let body: unknown;

  try {
    body = await response.json();
  } catch {
    throw new AppError(
      "Flutterwave returned an invalid response.",
      502,
    );
  }

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    throw new AppError(
      "Flutterwave returned an invalid response.",
      502,
    );
  }

  return body;
}

function getFlutterwaveErrorMessage(
  body: unknown,
  fallback: string,
): string {
  if (
    body &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    "message" in body &&
    typeof body.message === "string" &&
    body.message.trim()
  ) {
    return body.message.trim();
  }

  return fallback;
}

function getDefaultPaymentOptions(
  currency: FlutterwaveCurrency,
): string {
  if (currency === "USD") {
    return [
      "card",
      "account",
    ].join(", ");
  }

  return [
    "card",
    "ussd",
    "banktransfer",
    "account",
    "internetbanking",
    "nqr",
    "enaira",
    "opay",
  ].join(", ");
}

function normalizePaymentOptions(
  currency: FlutterwaveCurrency,
  paymentOptions?: string,
): string {
  const allowedOptions =
    currency === "USD"
      ? new Set([
          "card",
          "account",
        ])
      : new Set([
          "card",
          "ussd",
          "banktransfer",
          "account",
          "internetbanking",
          "nqr",
          "enaira",
          "opay",
        ]);

  const value =
    paymentOptions?.trim();

  if (!value) {
    return getDefaultPaymentOptions(
      currency,
    );
  }

  const options = value
    .split(",")
    .map((option) =>
      option.trim().toLowerCase(),
    )
    .filter(Boolean);

  const invalidOptions = [
    ...new Set(
      options.filter(
        (option) =>
          !allowedOptions.has(option),
      ),
    ),
  ];

  if (invalidOptions.length) {
    throw new AppError(
      `Unsupported Flutterwave payment method(s): ${invalidOptions.join(", ")}.`,
      500,
    );
  }

  const validOptions = [
    ...new Set(options),
  ];

  if (!validOptions.length) {
    return getDefaultPaymentOptions(
      currency,
    );
  }

  return validOptions.join(", ");
}

function validatePositiveAmount(
  amount: string,
): string {
  if (
    typeof amount !== "string"
  ) {
    throw new AppError(
      "Flutterwave payment amount must be provided as a string.",
      500,
    );
  }

  const normalizedAmount =
    amount.trim();

  if (!normalizedAmount) {
    throw new AppError(
      "Flutterwave payment amount is required.",
      500,
    );
  }

  if (
    !/^\d+(?:\.\d+)?$/.test(
      normalizedAmount,
    )
  ) {
    throw new AppError(
      "Flutterwave payment amount must be a valid positive decimal.",
      500,
    );
  }

  const decimalPart =
    normalizedAmount.split(".")[1];

  if (
    decimalPart &&
    decimalPart.length >
      MAX_AMOUNT_DECIMAL_PLACES
  ) {
    throw new AppError(
      `Flutterwave payment amount cannot have more than ${MAX_AMOUNT_DECIMAL_PLACES} decimal places.`,
      500,
    );
  }

  let decimalAmount: Decimal;

  try {
    decimalAmount =
      new Decimal(normalizedAmount);
  } catch {
    throw new AppError(
      "Flutterwave payment amount is invalid.",
      500,
    );
  }

  if (
    !decimalAmount.isFinite() ||
    decimalAmount.isNegative() ||
    decimalAmount.isZero()
  ) {
    throw new AppError(
      "Flutterwave payment amount must be greater than zero.",
      500,
    );
  }

  return decimalAmount
    .toFixed(
      MAX_AMOUNT_DECIMAL_PLACES,
    );
}

function validateTransactionReference(
  transactionReference: string,
): string {
  if (
    typeof transactionReference !==
    "string"
  ) {
    throw new AppError(
      "Flutterwave transaction reference is required.",
      500,
    );
  }

  const normalized =
    transactionReference.trim();

  if (!normalized) {
    throw new AppError(
      "Flutterwave transaction reference is required.",
      500,
    );
  }

  if (
    normalized.length >
    MAX_TRANSACTION_REFERENCE_LENGTH
  ) {
    throw new AppError(
      "Flutterwave transaction reference is too long.",
      500,
    );
  }

  if (
    !/^[A-Za-z0-9._:-]+$/.test(
      normalized,
    )
  ) {
    throw new AppError(
      "Flutterwave transaction reference contains invalid characters.",
      500,
    );
  }

  return normalized;
}

function validateRedirectUrl(
  redirectUrl: string,
): string {
  if (
    typeof redirectUrl !==
    "string"
  ) {
    throw new AppError(
      "Flutterwave redirect URL is required.",
      500,
    );
  }

  const normalized =
    redirectUrl.trim();

  if (!normalized) {
    throw new AppError(
      "Flutterwave redirect URL is required.",
      500,
    );
  }

  let url: URL;

  try {
    url = new URL(normalized);
  } catch {
    throw new AppError(
      "Flutterwave redirect URL is invalid.",
      500,
    );
  }

  if (
    !["http:", "https:"].includes(
      url.protocol,
    )
  ) {
    throw new AppError(
      "Flutterwave redirect URL must use HTTP or HTTPS.",
      500,
    );
  }

  if (!url.hostname) {
    throw new AppError(
      "Flutterwave redirect URL is invalid.",
      500,
    );
  }

  return url.toString();
}

function validateCustomer(
  customer: FlutterwaveCustomer,
): void {
  if (
    !customer ||
    typeof customer !== "object"
  ) {
    throw new AppError(
      "Flutterwave customer information is required.",
      500,
    );
  }

  if (
    typeof customer.email !==
    "string"
  ) {
    throw new AppError(
      "Flutterwave customer email is required.",
      500,
    );
  }

  const email =
    customer.email.trim();

  if (!email) {
    throw new AppError(
      "Flutterwave customer email is required.",
      500,
    );
  }

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email,
    )
  ) {
    throw new AppError(
      "Flutterwave customer email is invalid.",
      500,
    );
  }

  if (
    customer.name !== undefined &&
    (
      typeof customer.name !==
        "string" ||
      !customer.name.trim()
    )
  ) {
    throw new AppError(
      "Flutterwave customer name cannot be empty.",
      500,
    );
  }

  if (
    customer.phoneNumber !==
      undefined &&
    (
      typeof customer.phoneNumber !==
        "string" ||
      !customer.phoneNumber.trim()
    )
  ) {
    throw new AppError(
      "Flutterwave customer phone number cannot be empty.",
      500,
    );
  }
}

function validateCustomization(
  customization?: FlutterwaveCustomization,
): void {
  if (!customization) {
    return;
  }

  if (
    typeof customization !==
      "object"
  ) {
    throw new AppError(
      "Flutterwave customization data is invalid.",
      500,
    );
  }

  if (
    customization.title !==
      undefined &&
    (
      typeof customization.title !==
        "string" ||
      !customization.title.trim()
    )
  ) {
    throw new AppError(
      "Flutterwave customization title cannot be empty.",
      500,
    );
  }

  if (
    customization.description !==
      undefined &&
    (
      typeof customization.description !==
        "string" ||
      !customization.description.trim()
    )
  ) {
    throw new AppError(
      "Flutterwave customization description cannot be empty.",
      500,
    );
  }
}

function validateConfigurations(
  configurations?: FlutterwaveConfigurations,
): void {
  if (!configurations) {
    return;
  }

  if (
    typeof configurations !==
      "object"
  ) {
    throw new AppError(
      "Flutterwave configuration data is invalid.",
      500,
    );
  }

  const sessionDuration =
    configurations.session_duration;

  if (
    sessionDuration !==
      undefined &&
    (
      !Number.isInteger(
        sessionDuration,
      ) ||
      sessionDuration < 1 ||
      sessionDuration > 1440
    )
  ) {
    throw new AppError(
      "Flutterwave session duration must be between 1 and 1440 minutes.",
      500,
    );
  }

  const maxRetryAttempts =
    configurations.max_retry_attempt;

  if (
    maxRetryAttempts !==
      undefined &&
    (
      !Number.isInteger(
        maxRetryAttempts,
      ) ||
      maxRetryAttempts < 1 ||
      maxRetryAttempts > 10
    )
  ) {
    throw new AppError(
      "Flutterwave maximum retry attempts must be between 1 and 10.",
      500,
    );
  }
}

function validateMeta(
  meta?: Record<
    string,
    string | number | boolean | null
  >,
): void {
  if (!meta) {
    return;
  }

  if (
    typeof meta !== "object" ||
    Array.isArray(meta)
  ) {
    throw new AppError(
      "Flutterwave payment metadata is invalid.",
      500,
    );
  }

  const keys =
    Object.keys(meta);

  if (
    keys.length >
    MAX_META_KEYS
  ) {
    throw new AppError(
      "Flutterwave payment metadata contains too many fields.",
      500,
    );
  }

  for (const key of keys) {
    if (!key.trim()) {
      throw new AppError(
        "Flutterwave payment metadata contains an invalid key.",
        500,
      );
    }

    if (
      key.length >
      MAX_META_KEY_LENGTH
    ) {
      throw new AppError(
        "Flutterwave payment metadata key is too long.",
        500,
      );
    }

    const value =
      meta[key];

    if (
      typeof value === "string" &&
      value.length >
        MAX_META_VALUE_LENGTH
    ) {
      throw new AppError(
        "Flutterwave payment metadata value is too long.",
        500,
      );
    }

    if (
      typeof value !== "string" &&
      typeof value !== "number" &&
      typeof value !== "boolean" &&
      value !== null
    ) {
      throw new AppError(
        "Flutterwave payment metadata contains an unsupported value.",
        500,
      );
    }

    if (
      typeof value === "number" &&
      !Number.isFinite(value)
    ) {
      throw new AppError(
        "Flutterwave payment metadata contains an invalid number.",
        500,
      );
    }
  }
}

function validateInitializeInput(
  input: InitializeFlutterwavePaymentInput,
): void {
  if (
    !input ||
    typeof input !== "object"
  ) {
    throw new AppError(
      "Flutterwave payment initialization data is required.",
      500,
    );
  }

  validateTransactionReference(
    input.transactionReference,
  );

  validatePositiveAmount(
    input.amount,
  );

  if (
    !["USD", "NGN"].includes(
      input.currency,
    )
  ) {
    throw new AppError(
      "Unsupported Flutterwave payment currency.",
      500,
    );
  }

  validateRedirectUrl(
    input.redirectUrl,
  );

  validateCustomer(
    input.customer,
  );

  validateCustomization(
    input.customization,
  );

  validateConfigurations(
    input.configurations,
  );

  validateMeta(
    input.meta,
  );
}

function validateTransactionId(
  transactionId: string | number,
): string {
  if (
    typeof transactionId !==
      "string" &&
    typeof transactionId !==
      "number"
  ) {
    throw new AppError(
      "Flutterwave transaction ID is required.",
      500,
    );
  }

  const normalizedTransactionId =
    String(transactionId).trim();

  if (!normalizedTransactionId) {
    throw new AppError(
      "Flutterwave transaction ID is required.",
      500,
    );
  }

  if (
    normalizedTransactionId.length >
    MAX_TRANSACTION_ID_LENGTH
  ) {
    throw new AppError(
      "Flutterwave transaction ID is too long.",
      500,
    );
  }

  if (
    !/^[A-Za-z0-9._:-]+$/.test(
      normalizedTransactionId,
    )
  ) {
    throw new AppError(
      "Flutterwave transaction ID is invalid.",
      500,
    );
  }

  return normalizedTransactionId;
}

function normalizeProviderAmount(
  amount: unknown,
  fieldName: string,
): string {
  if (
    typeof amount !== "string" &&
    typeof amount !== "number"
  ) {
    throw new AppError(
      `Flutterwave returned an invalid ${fieldName}.`,
      502,
    );
  }

  const normalized =
    String(amount).trim();

  if (
    !normalized ||
    !/^\d+(?:\.\d+)?$/.test(
      normalized,
    )
  ) {
    throw new AppError(
      `Flutterwave returned an invalid ${fieldName}.`,
      502,
    );
  }

  const decimalPart =
    normalized.split(".")[1];

  if (
    decimalPart &&
    decimalPart.length >
      MAX_AMOUNT_DECIMAL_PLACES
  ) {
    throw new AppError(
      `Flutterwave returned an invalid ${fieldName}.`,
      502,
    );
  }

  let decimalAmount: Decimal;

  try {
    decimalAmount =
      new Decimal(normalized);
  } catch {
    throw new AppError(
      `Flutterwave returned an invalid ${fieldName}.`,
      502,
    );
  }

  if (
    !decimalAmount.isFinite() ||
    decimalAmount.isNegative()
  ) {
    throw new AppError(
      `Flutterwave returned an invalid ${fieldName}.`,
      502,
    );
  }

  return decimalAmount
    .toFixed(
      MAX_AMOUNT_DECIMAL_PLACES,
    );
}

function validateProviderCurrency(
  currency: unknown,
): string {
  if (
    typeof currency !== "string" ||
    !currency.trim()
  ) {
    throw new AppError(
      "Flutterwave returned an invalid transaction currency.",
      502,
    );
  }

  return currency
    .trim()
    .toUpperCase();
}

function validateProviderStatus(
  status: unknown,
): string {
  if (
    typeof status !== "string" ||
    !status.trim()
  ) {
    throw new AppError(
      "Flutterwave returned an invalid transaction status.",
      502,
    );
  }

  return status.trim();
}

function normalizeOptionalProviderString(
  value: unknown,
  fieldName: string,
  maxLength = 500,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (
    typeof value !== "string"
  ) {
    throw new AppError(
      `Flutterwave returned an invalid ${fieldName}.`,
      502,
    );
  }

  const normalized =
    value.trim();

  if (
    normalized.length >
    maxLength
  ) {
    throw new AppError(
      `Flutterwave returned an invalid ${fieldName}.`,
      502,
    );
  }

  return normalized || undefined;
}

function validateProviderCustomer(
  customer: unknown,
): FlutterwaveTransactionCustomer | undefined {
  if (
    customer === undefined ||
    customer === null
  ) {
    return undefined;
  }

  if (
    typeof customer !== "object" ||
    Array.isArray(customer)
  ) {
    throw new AppError(
      "Flutterwave returned invalid customer data.",
      502,
    );
  }

  const value =
    customer as Record<
      string,
      unknown
    >;

  let id:
    | number
    | string
    | undefined;

  if (value.id !== undefined) {
    if (
      typeof value.id !==
        "number" &&
      typeof value.id !==
        "string"
    ) {
      throw new AppError(
        "Flutterwave returned an invalid customer ID.",
        502,
      );
    }

    if (
      typeof value.id ===
        "number" &&
      !Number.isFinite(value.id)
    ) {
      throw new AppError(
        "Flutterwave returned an invalid customer ID.",
        502,
      );
    }

    id = value.id;
  }

  const name =
    normalizeOptionalProviderString(
      value.name,
      "customer name",
    );

  const phoneNumber =
    normalizeOptionalProviderString(
      value.phone_number,
      "customer phone number",
    );

  const email =
    normalizeOptionalProviderString(
      value.email,
      "customer email",
    );

  const createdAt =
    normalizeOptionalProviderString(
      value.created_at,
      "customer creation date",
      100,
    );

  return {
    ...(id !== undefined
      ? { id }
      : {}),
    ...(name !== undefined
      ? { name }
      : {}),
    ...(phoneNumber !== undefined
      ? {
          phone_number:
            phoneNumber,
        }
      : {}),
    ...(email !== undefined
      ? { email }
      : {}),
    ...(createdAt !== undefined
      ? {
          created_at:
            createdAt,
        }
      : {}),
  };
}

function buildInitializePayload(
  input: InitializeFlutterwavePaymentInput,
): Record<string, unknown> {
  const transactionReference =
    validateTransactionReference(
      input.transactionReference,
    );

  const amount =
    validatePositiveAmount(
      input.amount,
    );

  const paymentOptions =
    normalizePaymentOptions(
      input.currency,
      input.paymentOptions,
    );

  const redirectUrl =
    validateRedirectUrl(
      input.redirectUrl,
    );

  return {
    tx_ref:
      transactionReference,

    amount,

    currency:
      input.currency,

    redirect_url:
      redirectUrl,

    payment_options:
      paymentOptions,

    customer: {
      email:
        input.customer.email.trim(),

      ...(input.customer.name?.trim()
        ? {
            name:
              input.customer.name.trim(),
          }
        : {}),

      ...(input.customer.phoneNumber?.trim()
        ? {
            phonenumber:
              input.customer.phoneNumber.trim(),
          }
        : {}),
    },

    ...(input.customization &&
    (
      input.customization.title?.trim() ||
      input.customization.description?.trim()
    )
      ? {
          customizations: {
            ...(input.customization.title?.trim()
              ? {
                  title:
                    input.customization.title.trim(),
                }
              : {}),

            ...(input.customization.description?.trim()
              ? {
                  description:
                    input.customization.description.trim(),
                }
              : {}),
          },
        }
      : {}),

    ...(input.configurations
      ? {
          configurations: {
            ...input.configurations,
          },
        }
      : {}),

    ...(input.meta
      ? {
          meta: {
            ...input.meta,
          },
        }
      : {}),
  };
}

function validateInitializeResponseLink(
  link: unknown,
): string {
  if (
    typeof link !== "string" ||
    !link.trim()
  ) {
    throw new AppError(
      "Flutterwave did not return a payment link.",
      502,
    );
  }

  const normalizedLink =
    link.trim();

  let url: URL;

  try {
    url = new URL(
      normalizedLink,
    );
  } catch {
    throw new AppError(
      "Flutterwave returned an invalid payment link.",
      502,
    );
  }

  if (
    url.protocol !== "https:" ||
    !url.hostname
  ) {
    throw new AppError(
      "Flutterwave returned an invalid payment link.",
      502,
    );
  }

  return normalizedLink;
}

function getProviderStatus(
  body: Record<string, unknown>,
): string {
  if (
    typeof body.status !==
    "string"
  ) {
    return "";
  }

  return body.status.trim();
}

function getProviderMessage(
  body: Record<string, unknown>,
): string {
  if (
    typeof body.message !==
    "string"
  ) {
    return "";
  }

  return body.message.trim();
}

function getProviderTransactionData(
  body: Record<string, unknown>,
): Record<string, unknown> {
  const data =
    body.data;

  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data)
  ) {
    throw new AppError(
      "Flutterwave returned no transaction data.",
      502,
    );
  }

  return data as Record<
    string,
    unknown
  >;
}

function buildTrustedTransactionData(
  transaction: Record<
    string,
    unknown
  >,
): FlutterwaveTransactionData {
  const id =
    transaction.id;

  if (
    typeof id !== "string" &&
    typeof id !== "number"
  ) {
    throw new AppError(
      "Flutterwave returned an invalid transaction ID.",
      502,
    );
  }

  if (
    typeof id === "number" &&
    !Number.isFinite(id)
  ) {
    throw new AppError(
      "Flutterwave returned an invalid transaction ID.",
      502,
    );
  }

  const normalizedId =
    String(id).trim();

  if (!normalizedId) {
    throw new AppError(
      "Flutterwave returned an invalid transaction ID.",
      502,
    );
  }

  if (
    normalizedId.length >
    MAX_TRANSACTION_ID_LENGTH
  ) {
    throw new AppError(
      "Flutterwave returned an invalid transaction ID.",
      502,
    );
  }

  const txRef =
    transaction.tx_ref;

  if (
    typeof txRef !== "string" ||
    !txRef.trim()
  ) {
    throw new AppError(
      "Flutterwave returned an invalid transaction reference.",
      502,
    );
  }

  const normalizedTxRef =
    validateTransactionReference(
      txRef,
    );

  const amount =
    normalizeProviderAmount(
      transaction.amount,
      "transaction amount",
    );

  const currency =
    validateProviderCurrency(
      transaction.currency,
    );

  const status =
    validateProviderStatus(
      transaction.status,
    );

  const chargedAmount =
    transaction.charged_amount !==
    undefined
      ? normalizeProviderAmount(
          transaction.charged_amount,
          "charged amount",
        )
      : undefined;

  const amountSettled =
    transaction.amount_settled !==
    undefined
      ? normalizeProviderAmount(
          transaction.amount_settled,
          "settled amount",
        )
      : undefined;

  const flwRef =
    normalizeOptionalProviderString(
      transaction.flw_ref,
      "Flutterwave reference",
      200,
    );

  const paymentType =
    normalizeOptionalProviderString(
      transaction.payment_type,
      "payment type",
      100,
    );

  const processorResponse =
    normalizeOptionalProviderString(
      transaction.processor_response,
      "processor response",
      500,
    );

  const createdAt =
    normalizeOptionalProviderString(
      transaction.created_at,
      "transaction creation date",
      100,
    );

  const customer =
    validateProviderCustomer(
      transaction.customer,
    );

  return {
    id:
      typeof id === "number"
        ? id
        : normalizedId,

    tx_ref:
      normalizedTxRef,

    ...(flwRef !== undefined
      ? {
          flw_ref: flwRef,
        }
      : {}),

    amount,

    currency,

    ...(chargedAmount !== undefined
      ? {
          charged_amount:
            chargedAmount,
        }
      : {}),

    ...(amountSettled !== undefined
      ? {
          amount_settled:
            amountSettled,
        }
      : {}),

    status,

    ...(paymentType !== undefined
      ? {
          payment_type:
            paymentType,
        }
      : {}),

    ...(processorResponse !==
    undefined
      ? {
          processor_response:
            processorResponse,
        }
      : {}),

    ...(createdAt !== undefined
      ? {
          created_at:
            createdAt,
        }
      : {}),

    ...(customer !== undefined
      ? {
          customer,
        }
      : {}),
  };
}

export async function initializeFlutterwavePayment(
  input: InitializeFlutterwavePaymentInput,
): Promise<FlutterwaveInitializePaymentResult> {
  validateInitializeInput(input);

  const apiUrl =
    getApiUrl();

  const secretKey =
    getSecretKey();

  const {
    controller,
    timeout,
  } =
    createTimeoutController();

  let response: Response;

  try {
    response = await fetch(
      `${apiUrl}/payments`,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${secretKey}`,

          "Content-Type":
            "application/json",

          Accept:
            "application/json",

          "X-Idempotency-Key":
            validateTransactionReference(
              input.transactionReference,
            ),
        },

        body: JSON.stringify(
          buildInitializePayload(
            input,
          ),
        ),

        signal:
          controller.signal,
      },
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw new AppError(
        "Flutterwave payment initialization timed out.",
        504,
      );
    }

    if (
      error instanceof TypeError
    ) {
      throw new AppError(
        "Unable to connect to Flutterwave.",
        502,
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const body =
    await parseResponseBody(
      response,
    );

  if (!response.ok) {
    throw new AppError(
      getFlutterwaveErrorMessage(
        body,
        "Unable to initialize Flutterwave payment.",
      ),
      502,
    );
  }

  const responseBody =
    body as Record<
      string,
      unknown
    >;

  const status =
    getProviderStatus(
      responseBody,
    );

  const message =
    getProviderMessage(
      responseBody,
    );

  if (
    status.toLowerCase() !==
    "success"
  ) {
    throw new AppError(
      getFlutterwaveErrorMessage(
        body,
        "Flutterwave rejected the payment initialization request.",
      ),
      502,
    );
  }

  const data =
    responseBody.data;

  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    !("link" in data)
  ) {
    throw new AppError(
      "Flutterwave did not return a payment link.",
      502,
    );
  }

  const link =
    validateInitializeResponseLink(
      data.link,
    );

  return {
    status,
    message,

    data: {
      link,
    },
  };
}

export async function verifyFlutterwaveTransaction(
  transactionId: string | number,
): Promise<FlutterwaveVerifyTransactionResult> {
  const normalizedTransactionId =
    validateTransactionId(
      transactionId,
    );

  const apiUrl =
    getApiUrl();

  const secretKey =
    getSecretKey();

  const {
    controller,
    timeout,
  } =
    createTimeoutController();

  let response: Response;

  try {
    response = await fetch(
      `${apiUrl}/transactions/${encodeURIComponent(
        normalizedTransactionId,
      )}/verify`,
      {
        method: "GET",

        headers: {
          Authorization:
            `Bearer ${secretKey}`,

          Accept:
            "application/json",
        },

        signal:
          controller.signal,
      },
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw new AppError(
        "Flutterwave transaction verification timed out.",
        504,
      );
    }

    if (
      error instanceof TypeError
    ) {
      throw new AppError(
        "Unable to connect to Flutterwave.",
        502,
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const body =
    await parseResponseBody(
      response,
    );

  if (!response.ok) {
    throw new AppError(
      getFlutterwaveErrorMessage(
        body,
        "Unable to verify Flutterwave transaction.",
      ),
      502,
    );
  }

  const responseBody =
    body as Record<
      string,
      unknown
    >;

  const status =
    getProviderStatus(
      responseBody,
    );

  const message =
    getProviderMessage(
      responseBody,
    );

  if (
    status.toLowerCase() !==
    "success"
  ) {
    throw new AppError(
      getFlutterwaveErrorMessage(
        body,
        "Flutterwave transaction verification failed.",
      ),
      502,
    );
  }

  const transaction =
    getProviderTransactionData(
      responseBody,
    );

  const trustedTransaction =
    buildTrustedTransactionData(
      transaction,
    );

  return {
    status,
    message,
    data:
      trustedTransaction,
  };
}