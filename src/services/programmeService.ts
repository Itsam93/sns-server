import mongoose from "mongoose";

import {
  SUPPORTED_CURRENCIES,
  type Currency,
} from "../config/currencies.js";

import {
  Programme,
  type IProgramme,
} from "../models/Programme.js";

import { AppError } from "../utils/appError.js";

type ProgrammePricingCode =
  | "early_bird"
  | "standard"
  | "one_on_one";

type ProgrammeStatus =
  | "draft"
  | "published"
  | "ongoing"
  | "completed"
  | "cancelled";

type ProgrammePricingInput = {
  code: ProgrammePricingCode;
  name: string;
  description?: string;
  pricing: Partial<Record<Currency, number>>;
  availableFrom?: Date;
  availableUntil?: Date;
  isActive?: boolean;
};

type ProgrammeGroupDiscountInput = {
  minParticipants: number;
  discountPercent: number;
  isActive?: boolean;
};

type CreateProgrammeInput = {
  title: string;
  slug: string;
  description: string;
  shortDescription?: string;
  startDate: Date;
  endDate: Date;
  durationWeeks?: number;
  capacity?: number;
  reservedCapacity?: number;
  pricingOptions: ProgrammePricingInput[];
  groupDiscounts?: ProgrammeGroupDiscountInput[];
  status?: ProgrammeStatus;
  featuredImage?: string;
};

type UpdateProgrammeInput = {
  title?: string;
  slug?: string;
  description?: string;
  shortDescription?: string;
  startDate?: Date;
  endDate?: Date;
  durationWeeks?: number;
  capacity?: number;
  reservedCapacity?: number;
  pricingOptions?: ProgrammePricingInput[];
  groupDiscounts?: ProgrammeGroupDiscountInput[];
  status?: ProgrammeStatus;
  featuredImage?: string;
};

function validateObjectId(
  id: string,
  fieldName: string,
): mongoose.Types.ObjectId {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(
      `Invalid ${fieldName}.`,
      400,
    );
  }

  return new mongoose.Types.ObjectId(id);
}

function normalizeSlug(
  slug: string,
): string {
  return slug
    .trim()
    .toLowerCase();
}

function normalizeGroupDiscounts(
  groupDiscounts: ProgrammeGroupDiscountInput[] = [],
) {
  return groupDiscounts.map(
    (discount) => ({
      minParticipants:
        discount.minParticipants,
      discountPercent:
        discount.discountPercent,
      isActive:
        discount.isActive ?? true,
    }),
  );
}

function validateDateRange(
  startDate: Date,
  endDate: Date,
): void {
  if (
    Number.isNaN(
      startDate.getTime(),
    ) ||
    Number.isNaN(
      endDate.getTime(),
    )
  ) {
    throw new AppError(
      "Programme dates are invalid.",
      400,
    );
  }

  if (startDate >= endDate) {
    throw new AppError(
      "Programme end date must be after the start date.",
      400,
    );
  }
}

function validateCapacity(
  capacity?: number,
  reservedCapacity = 0,
): void {
  if (
    capacity !== undefined &&
    (
      !Number.isInteger(
        capacity,
      ) ||
      capacity < 1
    )
  ) {
    throw new AppError(
      "Programme capacity must be a whole number greater than zero.",
      400,
    );
  }

  if (
    !Number.isInteger(
      reservedCapacity,
    ) ||
    reservedCapacity < 0
  ) {
    throw new AppError(
      "Reserved capacity must be a whole number greater than or equal to zero.",
      400,
    );
  }

  if (
    capacity !== undefined &&
    reservedCapacity > capacity
  ) {
    throw new AppError(
      "Reserved capacity cannot exceed programme capacity.",
      400,
    );
  }
}

function validateCurrencyPricing(
  pricing: Partial<Record<Currency, number>>,
  optionCode: ProgrammePricingCode,
): void {
  const entries =
    Object.entries(
      pricing,
    ) as [
      Currency,
      number,
    ][];

  if (entries.length === 0) {
    throw new AppError(
      `Pricing option "${optionCode}" must have at least one currency price.`,
      400,
    );
  }

  for (
    const [
      currency,
      amount,
    ] of entries
  ) {
    if (
      !(
        SUPPORTED_CURRENCIES as readonly string[]
      ).includes(currency)
    ) {
      throw new AppError(
        `Unsupported currency "${currency}" for pricing option "${optionCode}".`,
        400,
      );
    }

    if (
      !Number.isFinite(
        amount,
      ) ||
      amount <= 0
    ) {
      throw new AppError(
        `${currency} price for "${optionCode}" must be greater than zero.`,
        400,
      );
    }
  }
}

function validatePricingOptions(
  pricingOptions: ProgrammePricingInput[],
  startDate: Date,
  endDate: Date,
): void {
  if (
    pricingOptions.length === 0
  ) {
    throw new AppError(
      "At least one programme pricing option is required.",
      400,
    );
  }

  const codes =
    pricingOptions.map(
      (option) =>
        option.code,
    );

  if (
    new Set(codes).size !==
    codes.length
  ) {
    throw new AppError(
      "Programme pricing option codes must be unique.",
      400,
    );
  }

  pricingOptions.forEach(
    (option) => {
      validateCurrencyPricing(
        option.pricing,
        option.code,
      );

      if (
        option.availableFrom &&
        option.availableUntil &&
        option.availableFrom >=
          option.availableUntil
      ) {
        throw new AppError(
          `Availability period for "${option.code}" is invalid.`,
          400,
        );
      }

      if (
        option.availableFrom &&
        option.availableFrom <
          startDate
      ) {
        throw new AppError(
          `Availability start for "${option.code}" cannot be before the programme start date.`,
          400,
        );
      }

      if (
        option.availableUntil &&
        option.availableUntil >
          endDate
      ) {
        throw new AppError(
          `Availability end for "${option.code}" cannot be after the programme end date.`,
          400,
        );
      }
    },
  );
}

function validateGroupDiscounts(
  groupDiscounts: ProgrammeGroupDiscountInput[] = [],
): void {
  const thresholds =
    groupDiscounts.map(
      (discount) =>
        discount.minParticipants,
    );

  if (
    new Set(thresholds).size !==
    thresholds.length
  ) {
    throw new AppError(
      "Programme group discount thresholds must be unique.",
      400,
    );
  }

  groupDiscounts.forEach(
    (discount) => {
      if (
        !Number.isInteger(
          discount.minParticipants,
        ) ||
        discount.minParticipants < 1
      ) {
        throw new AppError(
          "Minimum participants must be a whole number greater than zero.",
          400,
        );
      }

      if (
        !Number.isFinite(
          discount.discountPercent,
        ) ||
        discount.discountPercent < 0 ||
        discount.discountPercent > 100
      ) {
        throw new AppError(
          "Discount percentage must be between 0 and 100.",
          400,
        );
      }
    },
  );
}

function validatePublishedProgramme(
  status:
    | ProgrammeStatus
    | undefined,
  startDate: Date,
): void {
  if (
    status === "published" &&
    startDate <= new Date()
  ) {
    throw new AppError(
      "A published programme must have a future start date.",
      400,
    );
  }
}

async function ensureUniqueSlug(
  slug: string,
  excludeProgrammeId?: string,
): Promise<void> {
  const query: {
    slug: string;
    _id?: {
      $ne: mongoose.Types.ObjectId;
    };
  } = {
    slug,
  };

  if (excludeProgrammeId) {
    query._id = {
      $ne: validateObjectId(
        excludeProgrammeId,
        "programme ID",
      ),
    };
  }

  const existingProgramme =
    await Programme.findOne(
      query,
    );

  if (existingProgramme) {
    throw new AppError(
      "A programme with this slug already exists.",
      409,
    );
  }
}

async function getProgrammeOrFail(
  programmeId: string,
): Promise<IProgramme> {
  const id =
    validateObjectId(
      programmeId,
      "programme ID",
    );

  const programme =
    await Programme.findById(id);

  if (!programme) {
    throw new AppError(
      "Programme not found.",
      404,
    );
  }

  return programme;
}

function toDecimal128(
  amount: number,
): mongoose.Types.Decimal128 {
  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    throw new AppError(
      "Programme price must be greater than zero.",
      400,
    );
  }

  return mongoose.Types.Decimal128.fromString(
    amount.toFixed(2),
  );
}

function toPricingMap(
  pricing: Partial<Record<Currency, number>>,
): Map<
  Currency,
  mongoose.Types.Decimal128
> {
  const result =
    new Map<
      Currency,
      mongoose.Types.Decimal128
    >();

  for (
    const currency of SUPPORTED_CURRENCIES
  ) {
    const amount =
      pricing[currency];

    if (
      amount !== undefined
    ) {
      result.set(
        currency,
        toDecimal128(amount),
      );
    }
  }

  return result;
}

function pricingMapToInput(
  pricing: Map<
    Currency,
    mongoose.Types.Decimal128
  >,
): Partial<Record<Currency, number>> {
  const result: Partial<
    Record<Currency, number>
  > = {};

  for (
    const currency of SUPPORTED_CURRENCIES
  ) {
    const amount =
      pricing.get(currency);

    if (
      amount !== undefined
    ) {
      result[currency] =
        Number(
          amount.toString(),
        );
    }
  }

  return result;
}

function toPricingOptionDocuments(
  pricingOptions: ProgrammePricingInput[],
) {
  return pricingOptions.map(
    (option) => ({
      code:
        option.code,
      name:
        option.name.trim(),
      description:
        option.description?.trim(),
      pricing:
        toPricingMap(
          option.pricing,
        ),
      availableFrom:
        option.availableFrom,
      availableUntil:
        option.availableUntil,
      isActive:
        option.isActive ?? true,
    }),
  );
}

function pricingOptionsToInput(
  programme: IProgramme,
): ProgrammePricingInput[] {
  return programme.pricingOptions.map(
    (option) => ({
      code:
        option.code,
      name:
        option.name,
      description:
        option.description,
      pricing:
        pricingMapToInput(
          option.pricing,
        ),
      availableFrom:
        option.availableFrom,
      availableUntil:
        option.availableUntil,
      isActive:
        option.isActive,
    }),
  );
}

function handleProgrammeError(
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
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === 11000
  ) {
    throw new AppError(
      "A programme with the same unique value already exists.",
      409,
    );
  }

  throw error;
}

export async function createProgramme(
  data: CreateProgrammeInput,
) {
  const slug =
    normalizeSlug(
      data.slug,
    );

  const reservedCapacity =
    data.reservedCapacity ??
    0;

  const groupDiscounts =
    normalizeGroupDiscounts(
      data.groupDiscounts,
    );

  validateDateRange(
    data.startDate,
    data.endDate,
  );

  validateCapacity(
    data.capacity,
    reservedCapacity,
  );

  validatePricingOptions(
    data.pricingOptions,
    data.startDate,
    data.endDate,
  );

  validateGroupDiscounts(
    groupDiscounts,
  );

  validatePublishedProgramme(
    data.status,
    data.startDate,
  );

  await ensureUniqueSlug(
    slug,
  );

  try {
    return await Programme.create({
      title:
        data.title.trim(),

      slug,

      description:
        data.description.trim(),

      shortDescription:
        data.shortDescription?.trim(),

      startDate:
        data.startDate,

      endDate:
        data.endDate,

      durationWeeks:
        data.durationWeeks,

      capacity:
        data.capacity,

      reservedCapacity,

      pricingOptions:
        toPricingOptionDocuments(
          data.pricingOptions,
        ),

      groupDiscounts,

      status:
        data.status ??
        "draft",

      featuredImage:
        data.featuredImage?.trim(),
    });
  } catch (error) {
    return handleProgrammeError(
      error,
    );
  }
}

export async function getPublishedProgrammes() {
  return Programme.find({
    status: "published",
  }).sort({
    startDate: 1,
  });
}

export async function getActiveProgrammes() {
  return Programme.find({
    status: {
      $in: [
        "published",
        "ongoing",
      ],
    },
  }).sort({
    startDate: 1,
  });
}

export async function getAllProgrammes() {
  return Programme.find()
    .sort({
      startDate: -1,
    });
}

export async function getProgrammeById(
  programmeId: string,
) {
  return getProgrammeOrFail(
    programmeId,
  );
}

export async function getProgrammeBySlug(
  slug: string,
) {
  const normalizedSlug =
    normalizeSlug(
      slug,
    );

  const programme =
    await Programme.findOne({
      slug: normalizedSlug,
      status: {
        $in: [
          "published",
          "ongoing",
        ],
      },
    });

  if (!programme) {
    throw new AppError(
      "Programme not found.",
      404,
    );
  }

  return programme;
}

export async function updateProgramme(
  programmeId: string,
  data: UpdateProgrammeInput,
) {
  const programme =
    await getProgrammeOrFail(
      programmeId,
    );

  const nextStartDate =
    data.startDate ??
    programme.startDate;

  const nextEndDate =
    data.endDate ??
    programme.endDate;

  const nextCapacity =
    data.capacity ??
    programme.capacity;

  const nextReservedCapacity =
    data.reservedCapacity ??
    programme.reservedCapacity;

  const nextPricingOptions =
    data.pricingOptions ??
    pricingOptionsToInput(
      programme,
    );

  const nextGroupDiscounts =
    data.groupDiscounts ??
    programme.groupDiscounts.map(
      (discount) => ({
        minParticipants:
          discount.minParticipants,
        discountPercent:
          discount.discountPercent,
        isActive:
          discount.isActive,
      }),
    );

  const normalizedGroupDiscounts =
    normalizeGroupDiscounts(
      nextGroupDiscounts,
    );

  const nextStatus =
    data.status ??
    programme.status;

  validateDateRange(
    nextStartDate,
    nextEndDate,
  );

  validateCapacity(
    nextCapacity,
    nextReservedCapacity,
  );

  validatePricingOptions(
    nextPricingOptions,
    nextStartDate,
    nextEndDate,
  );

  validateGroupDiscounts(
    normalizedGroupDiscounts,
  );

  validatePublishedProgramme(
    nextStatus,
    nextStartDate,
  );

  if (
    data.slug !== undefined
  ) {
    const slug =
      normalizeSlug(
        data.slug,
      );

    if (
      slug !== programme.slug
    ) {
      await ensureUniqueSlug(
        slug,
        programmeId,
      );

      programme.slug =
        slug;
    }
  }

  if (
    data.title !== undefined
  ) {
    programme.title =
      data.title.trim();
  }

  if (
    data.description !==
    undefined
  ) {
    programme.description =
      data.description.trim();
  }

  if (
    data.shortDescription !==
    undefined
  ) {
    programme.shortDescription =
      data.shortDescription.trim();
  }

  programme.startDate =
    nextStartDate;

  programme.endDate =
    nextEndDate;

  if (
    data.durationWeeks !==
    undefined
  ) {
    programme.durationWeeks =
      data.durationWeeks;
  }

  programme.capacity =
    nextCapacity;

  programme.reservedCapacity =
    nextReservedCapacity;

  if (
    data.pricingOptions !==
    undefined
  ) {
    programme.pricingOptions =
      toPricingOptionDocuments(
        data.pricingOptions,
      );
  }

  if (
    data.groupDiscounts !==
    undefined
  ) {
    programme.groupDiscounts =
      normalizedGroupDiscounts;
  }

  if (
    data.status !==
    undefined
  ) {
    programme.status =
      data.status;
  }

  if (
    data.featuredImage !==
    undefined
  ) {
    programme.featuredImage =
      data.featuredImage.trim();
  }

  try {
    await programme.save();
  } catch (error) {
    return handleProgrammeError(
      error,
    );
  }

  return programme;
}

export async function updateProgrammeStatus(
  programmeId: string,
  status: ProgrammeStatus,
) {
  const programme =
    await getProgrammeOrFail(
      programmeId,
    );

  validatePublishedProgramme(
    status,
    programme.startDate,
  );

  programme.status =
    status;

  try {
    await programme.save();
  } catch (error) {
    return handleProgrammeError(
      error,
    );
  }

  return programme;
}

export async function publishProgramme(
  programmeId: string,
) {
  return updateProgrammeStatus(
    programmeId,
    "published",
  );
}

export async function startProgramme(
  programmeId: string,
) {
  const programme =
    await getProgrammeOrFail(
      programmeId,
    );

  if (
    programme.status !==
    "published"
  ) {
    throw new AppError(
      "Only a published programme can be started.",
      400,
    );
  }

  if (
    new Date() <
    programme.startDate
  ) {
    throw new AppError(
      "A programme cannot be started before its start date.",
      400,
    );
  }

  programme.status =
    "ongoing";

  try {
    await programme.save();
  } catch (error) {
    return handleProgrammeError(
      error,
    );
  }

  return programme;
}

export async function completeProgramme(
  programmeId: string,
) {
  const programme =
    await getProgrammeOrFail(
      programmeId,
    );

  if (
    ![
      "published",
      "ongoing",
    ].includes(
      programme.status,
    )
  ) {
    throw new AppError(
      "Only a published or ongoing programme can be completed.",
      400,
    );
  }

  programme.status =
    "completed";

  try {
    await programme.save();
  } catch (error) {
    return handleProgrammeError(
      error,
    );
  }

  return programme;
}

export async function cancelProgramme(
  programmeId: string,
) {
  const programme =
    await getProgrammeOrFail(
      programmeId,
    );

  if (
    programme.status ===
      "completed" ||
    programme.status ===
      "cancelled"
  ) {
    throw new AppError(
      "This programme can no longer be cancelled.",
      400,
    );
  }

  programme.status =
    "cancelled";

  try {
    await programme.save();
  } catch (error) {
    return handleProgrammeError(
      error,
    );
  }

  return programme;
}

export async function calculateGroupDiscount(
  programmeId: string,
  participantCount: number,
) {
  const programme =
    await getProgrammeOrFail(
      programmeId,
    );

  if (
    !Number.isInteger(
      participantCount,
    ) ||
    participantCount < 1
  ) {
    throw new AppError(
      "Participant count must be a whole number greater than zero.",
      400,
    );
  }

  const eligibleDiscounts =
    programme.groupDiscounts
      .filter(
        (discount) =>
          discount.isActive &&
          discount.minParticipants <=
            participantCount,
      )
      .sort(
        (
          first,
          second,
        ) =>
          second.minParticipants -
          first.minParticipants,
      );

  const discount =
    eligibleDiscounts[0];

  return {
    participantCount,
    discountPercent:
      discount?.discountPercent ??
      0,
    minimumParticipants:
      discount?.minParticipants ??
      null,
  };
}

export async function getProgrammePricingOption(
  programmeId: string,
  pricingOptionCode: ProgrammePricingCode,
  currency: Currency,
) {
  const programme =
    await getProgrammeOrFail(
      programmeId,
    );

  const pricingOption =
    programme.pricingOptions.find(
      (option) =>
        option.code ===
          pricingOptionCode &&
        option.isActive,
    );

  if (!pricingOption) {
    throw new AppError(
      "The selected programme pricing option is not available.",
      404,
    );
  }

  const price =
    pricingOption.pricing.get(
      currency,
    );

  if (
    price === undefined
  ) {
    throw new AppError(
      `This pricing option is not available in ${currency}.`,
      400,
    );
  }

  const now =
    new Date();

  if (
    pricingOption.availableFrom &&
    now <
      pricingOption.availableFrom
  ) {
    throw new AppError(
      "This programme pricing option is not yet available.",
      400,
    );
  }

  if (
    pricingOption.availableUntil &&
    now >
      pricingOption.availableUntil
  ) {
    throw new AppError(
      "This programme pricing option is no longer available.",
      400,
    );
  }

  return {
    code:
      pricingOption.code,
    name:
      pricingOption.name,
    description:
      pricingOption.description,
    currency,
    amount: price,
  };
}

export async function calculateProgrammePrice(
  programmeId: string,
  pricingOptionCode: ProgrammePricingCode,
  currency: Currency,
  participantCount = 1,
) {
  if (
    !Number.isInteger(
      participantCount,
    ) ||
    participantCount < 1
  ) {
    throw new AppError(
      "Participant count must be a whole number greater than zero.",
      400,
    );
  }

  const pricing =
    await getProgrammePricingOption(
      programmeId,
      pricingOptionCode,
      currency,
    );

  const discount =
    await calculateGroupDiscount(
      programmeId,
      participantCount,
    );

  const originalAmount =
    Number(
      pricing.amount.toString(),
    );

  const discountAmount =
    Number(
      (
        originalAmount *
        (
          discount.discountPercent /
          100
        )
      ).toFixed(2),
    );

  const finalAmount =
    Number(
      (
        originalAmount -
        discountAmount
      ).toFixed(2),
    );

  return {
    pricingOptionCode,
    currency,
    participantCount,
    originalAmount,
    discountPercent:
      discount.discountPercent,
    discountAmount,
    finalAmount,
  };
}

export async function getAvailableCapacity(
  programmeId: string,
) {
  const programme =
    await getProgrammeOrFail(
      programmeId,
    );

  if (
    programme.capacity ===
    undefined
  ) {
    return null;
  }

  return Math.max(
    programme.capacity -
      programme.reservedCapacity,
    0,
  );
}

export async function reserveProgrammeCapacity(
  programmeId: string,
  participantCount: number,
) {
  const programme =
    await getProgrammeOrFail(
      programmeId,
    );

  if (
    !Number.isInteger(
      participantCount,
    ) ||
    participantCount < 1
  ) {
    throw new AppError(
      "Participant count must be a whole number greater than zero.",
      400,
    );
  }

  if (
    programme.capacity ===
    undefined
  ) {
    return programme;
  }

  const availableCapacity =
    programme.capacity -
    programme.reservedCapacity;

  if (
    participantCount >
    availableCapacity
  ) {
    throw new AppError(
      "There is not enough programme capacity available.",
      409,
    );
  }

  programme.reservedCapacity +=
    participantCount;

  try {
    await programme.save();
  } catch (error) {
    return handleProgrammeError(
      error,
    );
  }

  return programme;
}

export async function releaseProgrammeCapacity(
  programmeId: string,
  participantCount: number,
) {
  const programme =
    await getProgrammeOrFail(
      programmeId,
    );

  if (
    !Number.isInteger(
      participantCount,
    ) ||
    participantCount < 1
  ) {
    throw new AppError(
      "Participant count must be a whole number greater than zero.",
      400,
    );
  }

  programme.reservedCapacity =
    Math.max(
      programme.reservedCapacity -
        participantCount,
      0,
    );

  try {
    await programme.save();
  } catch (error) {
    return handleProgrammeError(
      error,
    );
  }

  return programme;
}

export async function deleteProgramme(
  programmeId: string,
) {
  const programme =
    await getProgrammeOrFail(
      programmeId,
    );

  if (
    [
      "published",
      "ongoing",
    ].includes(
      programme.status,
    )
  ) {
    throw new AppError(
      "Published or ongoing programmes cannot be deleted.",
      409,
    );
  }

  await programme.deleteOne();

  return {
    deleted: true,
    programmeId,
  };
}