import mongoose from "mongoose";

import {
  SUPPORTED_CURRENCIES,
  type Currency,
} from "../config/currencies.js";

import {
  Service,
  type IService,
  type ServiceType,
} from "../models/Service.js";

import { AppError } from "../utils/appError.js";

type PricingInput = Record<Currency, number>;

type CreateServiceInput = {
  name: string;
  slug: string;
  description: string;
  type: ServiceType;
  durationMinutes: number;
  sessionCount?: number;
  pricing: PricingInput;
  isActive?: boolean;
};

type UpdateServiceInput = {
  name?: string;
  slug?: string;
  description?: string;
  type?: ServiceType;
  durationMinutes?: number;
  sessionCount?: number;
  pricing?: Partial<PricingInput>;
};

type SerializedService = {
  _id: string;
  name: string;
  slug: string;
  description: string;
  type: ServiceType;
  durationMinutes: number;
  sessionCount?: number;
  pricing: Record<Currency, number>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function validateObjectId(
  id: string,
  fieldName: string,
): void {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(
      `Invalid ${fieldName}.`,
      400,
    );
  }
}

function normalizeSlug(
  slug: string,
): string {
  const normalized = slug
    .trim()
    .toLowerCase();

  if (!normalized) {
    throw new AppError(
      "Service slug is required.",
      400,
    );
  }

  return normalized;
}

function validateServiceText(
  value: string,
  fieldName: string,
): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new AppError(
      `${fieldName} is required.`,
      400,
    );
  }

  return normalized;
}

function validateDuration(
  durationMinutes: number,
): void {
  if (
    !Number.isInteger(durationMinutes) ||
    durationMinutes < 15
  ) {
    throw new AppError(
      "Service duration must be a whole number of at least 15 minutes.",
      400,
    );
  }
}

function validateSessionCount(
  type: ServiceType,
  sessionCount?: number,
): void {
  if (
    type === "session_package" &&
    sessionCount === undefined
  ) {
    throw new AppError(
      "Session count is required for a session package.",
      400,
    );
  }

  if (
    sessionCount !== undefined &&
    (
      !Number.isInteger(sessionCount) ||
      sessionCount < 1
    )
  ) {
    throw new AppError(
      "Session count must be a whole number greater than zero.",
      400,
    );
  }

  if (
    type === "single_session" &&
    sessionCount !== undefined &&
    sessionCount !== 1
  ) {
    throw new AppError(
      "A single-session service must have a session count of 1.",
      400,
    );
  }
}

function validatePricing(
  pricing: PricingInput | Partial<PricingInput>,
): void {
  const currencies =
    Object.keys(pricing) as Currency[];

  if (currencies.length === 0) {
    throw new AppError(
      "At least one service price is required.",
      400,
    );
  }

  for (const currency of currencies) {
    if (
      !(
        SUPPORTED_CURRENCIES as readonly string[]
      ).includes(currency)
    ) {
      throw new AppError(
        `Unsupported service pricing currency "${currency}".`,
        400,
      );
    }

    const amount =
      pricing[currency];

    if (
      amount === undefined ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      throw new AppError(
        `${currency} service price must be greater than zero.`,
        400,
      );
    }
  }
}

function validateCompletePricing(
  pricing: PricingInput,
): void {
  for (const currency of SUPPORTED_CURRENCIES) {
    const amount =
      pricing[currency];

    if (
      amount === undefined ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      throw new AppError(
        `${currency} service price must be greater than zero.`,
        400,
      );
    }
  }
}

function pricingToMap(
  pricing: PricingInput,
): Map<
  Currency,
  mongoose.Types.Decimal128
> {
  const result =
    new Map<
      Currency,
      mongoose.Types.Decimal128
    >();

  for (const currency of SUPPORTED_CURRENCIES) {
    const amount =
      pricing[currency];

    result.set(
      currency,
      mongoose.Types.Decimal128.fromString(
        amount.toFixed(2),
      ),
    );
  }

  return result;
}

function mergePricing(
  existing: Map<
    Currency,
    mongoose.Types.Decimal128
  >,
  updates: Partial<PricingInput>,
): Map<
  Currency,
  mongoose.Types.Decimal128
> {
  const result =
    new Map<
      Currency,
      mongoose.Types.Decimal128
    >();

  for (const currency of SUPPORTED_CURRENCIES) {
    const existingAmount =
      existing.get(currency);

    if (existingAmount) {
      result.set(
        currency,
        existingAmount,
      );
    }
  }

  for (const currency of SUPPORTED_CURRENCIES) {
    const amount =
      updates[currency];

    if (amount === undefined) {
      continue;
    }

    result.set(
      currency,
      mongoose.Types.Decimal128.fromString(
        amount.toFixed(2),
      ),
    );
  }

  return result;
}

function decimalToNumber(
  value: unknown,
): number | undefined {
  if (
    value === undefined ||
    value === null
  ) {
    return undefined;
  }

  if (
    value instanceof
    mongoose.Types.Decimal128
  ) {
    const parsed =
      Number(value.toString());

    return Number.isFinite(parsed)
      ? parsed
      : undefined;
  }

  if (
    typeof value === "number"
  ) {
    return Number.isFinite(value)
      ? value
      : undefined;
  }

  if (
    typeof value === "string"
  ) {
    const parsed =
      Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : undefined;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "$numberDecimal" in value
  ) {
    const decimalValue =
      (
        value as {
          $numberDecimal?: unknown;
        }
      ).$numberDecimal;

    const parsed =
      Number(decimalValue);

    return Number.isFinite(parsed)
      ? parsed
      : undefined;
  }

  return undefined;
}

function serializePricing(
  pricing: unknown,
): Record<Currency, number> {
  const result =
    {} as Record<
      Currency,
      number
    >;

  const source =
    pricing instanceof Map
      ? Object.fromEntries(pricing)
      : pricing &&
          typeof pricing === "object"
        ? pricing as Record<
            string,
            unknown
          >
        : {};

  for (const currency of SUPPORTED_CURRENCIES) {
    const amount =
      decimalToNumber(
        source[currency],
      );

    if (
      amount === undefined ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      throw new AppError(
        `${currency} service price is missing or invalid.`,
        500,
      );
    }

    result[currency] = amount;
  }

  return result;
}

function serializeService(
  service: IService,
): SerializedService {
  return {
    _id: service._id.toString(),
    name: service.name,
    slug: service.slug,
    description: service.description,
    type: service.type,
    durationMinutes:
      service.durationMinutes,
    ...(service.sessionCount !==
    undefined
      ? {
          sessionCount:
            service.sessionCount,
        }
      : {}),
    pricing: serializePricing(
      service.pricing,
    ),
    isActive: service.isActive,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
  };
}

async function ensureUniqueSlug(
  slug: string,
  excludeServiceId?: string,
): Promise<void> {
  const query: {
    slug: string;
    _id?: {
      $ne: mongoose.Types.ObjectId;
    };
  } = {
    slug,
  };

  if (excludeServiceId) {
    validateObjectId(
      excludeServiceId,
      "service ID",
    );

    query._id = {
      $ne: new mongoose.Types.ObjectId(
        excludeServiceId,
      ),
    };
  }

  const existingService =
    await Service.findOne(query);

  if (existingService) {
    throw new AppError(
      "A service with this slug already exists.",
      409,
    );
  }
}

async function getServiceOrFail(
  serviceId: string,
): Promise<IService> {
  validateObjectId(
    serviceId,
    "service ID",
  );

  const service =
    await Service.findById(
      serviceId,
    );

  if (!service) {
    throw new AppError(
      "Service not found.",
      404,
    );
  }

  return service;
}

function handleServiceError(
  error: unknown,
): never {
  if (
    error instanceof
    mongoose.Error.ValidationError
  ) {
    throw new AppError(
      error.message,
      400,
    );
  }

  if (
    error instanceof
    mongoose.Error
  ) {
    throw error;
  }

  throw error;
}

export async function createService(
  data: CreateServiceInput,
): Promise<SerializedService> {
  const name =
    validateServiceText(
      data.name,
      "Service name",
    );

  const description =
    validateServiceText(
      data.description,
      "Service description",
    );

  const slug =
    normalizeSlug(
      data.slug,
    );

  validateDuration(
    data.durationMinutes,
  );

  validateSessionCount(
    data.type,
    data.sessionCount,
  );

  validatePricing(
    data.pricing,
  );

  validateCompletePricing(
    data.pricing,
  );

  await ensureUniqueSlug(
    slug,
  );

  try {
    const service =
      await Service.create({
        name,
        slug,
        description,
        type: data.type,
        durationMinutes:
          data.durationMinutes,
        sessionCount:
          data.sessionCount,
        pricing:
          pricingToMap(
            data.pricing,
          ),
        isActive:
          data.isActive ?? true,
      });

    return serializeService(
      service,
    );
  } catch (error) {
    return handleServiceError(
      error,
    );
  }
}

export async function getActiveServices(): Promise<
  SerializedService[]
> {
  const services =
    await Service.find({
      isActive: true,
    }).sort({
      name: 1,
    });

  return services.map(
    serializeService,
  );
}

export async function getAllServices(): Promise<
  SerializedService[]
> {
  const services =
    await Service.find()
      .sort({
        isActive: -1,
        name: 1,
      });

  return services.map(
    serializeService,
  );
}

export async function getServiceById(
  serviceId: string,
): Promise<SerializedService> {
  const service =
    await getServiceOrFail(
      serviceId,
    );

  return serializeService(
    service,
  );
}

export async function getServiceBySlug(
  slug: string,
): Promise<SerializedService> {
  const normalizedSlug =
    normalizeSlug(
      slug,
    );

  const service =
    await Service.findOne({
      slug: normalizedSlug,
      isActive: true,
    });

  if (!service) {
    throw new AppError(
      "Service not found.",
      404,
    );
  }

  return serializeService(
    service,
  );
}

export async function updateService(
  serviceId: string,
  data: UpdateServiceInput,
): Promise<SerializedService> {
  const service =
    await getServiceOrFail(
      serviceId,
    );

  const nextType =
    data.type ??
    service.type;

  const nextSessionCount =
    data.sessionCount !==
    undefined
      ? data.sessionCount
      : service.sessionCount;

  if (
    data.name !== undefined
  ) {
    service.name =
      validateServiceText(
        data.name,
        "Service name",
      );
  }

  if (
    data.description !==
    undefined
  ) {
    service.description =
      validateServiceText(
        data.description,
        "Service description",
      );
  }

  if (
    data.durationMinutes !==
    undefined
  ) {
    validateDuration(
      data.durationMinutes,
    );

    service.durationMinutes =
      data.durationMinutes;
  }

  validateSessionCount(
    nextType,
    nextSessionCount,
  );

  service.type =
    nextType;

  if (
    nextSessionCount !==
    undefined
  ) {
    service.sessionCount =
      nextSessionCount;
  } else {
    service.sessionCount =
      undefined;
  }

  if (
    data.slug !== undefined
  ) {
    const slug =
      normalizeSlug(
        data.slug,
      );

    if (
      slug !== service.slug
    ) {
      await ensureUniqueSlug(
        slug,
        serviceId,
      );

      service.slug =
        slug;
    }
  }

  if (
    data.pricing !== undefined
  ) {
    validatePricing(
      data.pricing,
    );

    service.pricing =
      mergePricing(
        service.pricing,
        data.pricing,
      );
  }

  if (
    service.pricing.size === 0
  ) {
    throw new AppError(
      "At least one service price is required.",
      400,
    );
  }

  for (const currency of SUPPORTED_CURRENCIES) {
    const amount =
      service.pricing.get(
        currency,
      );

    if (
      !amount ||
      Number(amount.toString()) <= 0
    ) {
      throw new AppError(
        `${currency} service price must be greater than zero.`,
        400,
      );
    }
  }

  try {
    await service.save();
  } catch (error) {
    return handleServiceError(
      error,
    );
  }

  return serializeService(
    service,
  );
}

export async function updateServiceStatus(
  serviceId: string,
  isActive: boolean,
): Promise<SerializedService> {
  const service =
    await getServiceOrFail(
      serviceId,
    );

  service.isActive =
    isActive;

  try {
    await service.save();
  } catch (error) {
    return handleServiceError(
      error,
    );
  }

  return serializeService(
    service,
  );
}

export async function activateService(
  serviceId: string,
): Promise<SerializedService> {
  return updateServiceStatus(
    serviceId,
    true,
  );
}

export async function deactivateService(
  serviceId: string,
): Promise<SerializedService> {
  return updateServiceStatus(
    serviceId,
    false,
  );
}

export async function deleteService(
  serviceId: string,
) {
  const service =
    await getServiceOrFail(
      serviceId,
    );

  await service.deleteOne();

  return {
    deleted: true,
    serviceId,
  };
}