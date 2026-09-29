import mongoose from "mongoose";

import {
  SUPPORTED_CURRENCIES,
  isSupportedCurrency,
  type Currency,
} from "../config/currencies.js";

import {
  Workshop,
  type WorkshopStatus,
  type WorkshopType,
} from "../models/Workshop.js";

import { AppError } from "../utils/appError.js";

type WorkshopTicketPricingInput =
  Partial<Record<Currency, number>>;

type WorkshopTicketTypeInput = {
  code: string;
  name: string;
  description?: string;
  attendeeCount: number;
  pricing: WorkshopTicketPricingInput;
  isActive?: boolean;
};

type CreateWorkshopInput = {
  title: string;
  slug: string;
  type: WorkshopType;
  description: string;
  shortDescription?: string;
  startDate: Date;
  endDate?: Date;
  startTime?: string;
  endTime?: string;
  location?: string;
  isOnline: boolean;
  meetingLink?: string;
  capacity?: number;
  reservedCapacity?: number;
  registrationRequired: boolean;
  registrationDeadline?: Date;
  ticketTypes: WorkshopTicketTypeInput[];
  status?: WorkshopStatus;
  featuredImage?: string;
};

type UpdateWorkshopInput =
  Partial<CreateWorkshopInput>;

const WORKSHOP_STATUSES:
  readonly WorkshopStatus[] = [
    "draft",
    "published",
    "completed",
    "cancelled",
  ];

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
  const normalized =
    slug.trim().toLowerCase();

  if (!normalized) {
    throw new AppError(
      "Workshop slug is required.",
      400,
    );
  }

  return normalized;
}

function normalizeRequiredText(
  value: string,
  fieldName: string,
): string {
  const normalized =
    value.trim();

  if (!normalized) {
    throw new AppError(
      `${fieldName} is required.`,
      400,
    );
  }

  return normalized;
}

function validateWorkshopDates(
  startDate: Date,
  endDate?: Date,
): void {
  if (
    Number.isNaN(
      startDate.getTime(),
    )
  ) {
    throw new AppError(
      "Workshop start date is invalid.",
      400,
    );
  }

  if (
    endDate &&
    Number.isNaN(
      endDate.getTime(),
    )
  ) {
    throw new AppError(
      "Workshop end date is invalid.",
      400,
    );
  }

  if (
    endDate &&
    endDate < startDate
  ) {
    throw new AppError(
      "End date must not be before the start date.",
      400,
    );
  }
}

function validateWorkshopTimes(
  startTime?: string,
  endTime?: string,
): void {
  if (
    startTime &&
    endTime &&
    startTime >= endTime
  ) {
    throw new AppError(
      "End time must be later than start time.",
      400,
    );
  }
}

function validateOnlineDetails(
  isOnline: boolean,
  meetingLink?: string,
  location?: string,
): void {
  if (
    isOnline &&
    !meetingLink?.trim()
  ) {
    throw new AppError(
      "Meeting link is required for online workshops.",
      400,
    );
  }

  if (
    isOnline &&
    location?.trim()
  ) {
    throw new AppError(
      "Online workshops should not have a physical location.",
      400,
    );
  }

  if (
    !isOnline &&
    !location?.trim()
  ) {
    throw new AppError(
      "Physical workshops must have a location.",
      400,
    );
  }
}

function validateRegistrationDeadline(
  startDate: Date,
  registrationDeadline?: Date,
): void {
  if (
    registrationDeadline &&
    Number.isNaN(
      registrationDeadline.getTime(),
    )
  ) {
    throw new AppError(
      "Workshop registration deadline is invalid.",
      400,
    );
  }

  if (
    registrationDeadline &&
    registrationDeadline > startDate
  ) {
    throw new AppError(
      "Registration deadline must not be after the workshop start date.",
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
      !Number.isInteger(capacity) ||
      capacity < 1
    )
  ) {
    throw new AppError(
      "Workshop capacity must be a whole number greater than zero.",
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
      "Reserved capacity cannot exceed workshop capacity.",
      400,
    );
  }
}

function validateTicketPricing(
  pricing: WorkshopTicketPricingInput,
  ticketCode: string,
): void {
  const currencies =
    Object.keys(
      pricing,
    ) as Currency[];

  if (currencies.length === 0) {
    throw new AppError(
      `Ticket "${ticketCode}" must have at least one currency price.`,
      400,
    );
  }

  for (const currency of currencies) {
    if (
      !isSupportedCurrency(
        currency,
      )
    ) {
      throw new AppError(
        `Unsupported ticket pricing currency "${currency}".`,
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
        `${currency} price for ticket "${ticketCode}" must be greater than zero.`,
        400,
      );
    }
  }
}

function validateTicketTypes(
  ticketTypes:
    WorkshopTicketTypeInput[],
): void {
  if (
    ticketTypes.length === 0
  ) {
    throw new AppError(
      "At least one workshop ticket type is required.",
      400,
    );
  }

  const normalizedCodes =
    ticketTypes.map(
      (ticket) =>
        ticket.code
          .trim()
          .toLowerCase(),
    );

  if (
    normalizedCodes.some(
      (code) => !code,
    )
  ) {
    throw new AppError(
      "Every workshop ticket type must have a code.",
      400,
    );
  }

  if (
    new Set(normalizedCodes)
      .size !==
    normalizedCodes.length
  ) {
    throw new AppError(
      "Workshop ticket type codes must be unique.",
      400,
    );
  }

  for (
    const ticket of ticketTypes
  ) {
    const code =
      ticket.code
        .trim()
        .toLowerCase();

    const name =
      ticket.name.trim();

    if (!name) {
      throw new AppError(
        `Ticket "${code}" must have a name.`,
        400,
      );
    }

    if (
      !Number.isInteger(
        ticket.attendeeCount,
      ) ||
      ticket.attendeeCount < 1
    ) {
      throw new AppError(
        `Attendee count for ticket "${code}" must be a whole number greater than zero.`,
        400,
      );
    }

    validateTicketPricing(
      ticket.pricing,
      code,
    );
  }
}

function pricingToMap(
  pricing: WorkshopTicketPricingInput,
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
    const currency of
      SUPPORTED_CURRENCIES
  ) {
    const amount =
      pricing[currency];

    if (
      amount === undefined
    ) {
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

function ticketToInput(
  ticket: {
    code: string;
    name: string;
    description?: string;
    attendeeCount: number;
    pricing: Map<
      Currency,
      mongoose.Types.Decimal128
    >;
    isActive: boolean;
  },
): WorkshopTicketTypeInput {
  const pricing:
    WorkshopTicketPricingInput =
    {};

  for (
    const currency of
      SUPPORTED_CURRENCIES
  ) {
    const amount =
      ticket.pricing.get(
        currency,
      );

    if (!amount) {
      continue;
    }

    pricing[currency] =
      Number(
        amount.toString(),
      );
  }

  return {
    code: ticket.code,
    name: ticket.name,
    description:
      ticket.description,
    attendeeCount:
      ticket.attendeeCount,
    pricing,
    isActive:
      ticket.isActive,
  };
}

function toWorkshopTicketDocuments(
  ticketTypes:
    WorkshopTicketTypeInput[],
) {
  return ticketTypes.map(
    (ticket) => ({
      code:
        ticket.code
          .trim()
          .toLowerCase(),

      name:
        ticket.name.trim(),

      description:
        ticket.description?.trim(),

      attendeeCount:
        ticket.attendeeCount,

      pricing:
        pricingToMap(
          ticket.pricing,
        ),

      isActive:
        ticket.isActive ?? true,
    }),
  );
}

function validatePublishedWorkshop(
  status:
    | WorkshopStatus
    | undefined,
  startDate: Date,
): void {
  if (
    status === "published" &&
    startDate <= new Date()
  ) {
    throw new AppError(
      "A published workshop must have a future start date.",
      400,
    );
  }
}

async function ensureUniqueSlug(
  slug: string,
  excludeWorkshopId?: string,
): Promise<void> {
  const query: {
    slug: string;
    _id?: {
      $ne: mongoose.Types.ObjectId;
    };
  } = {
    slug,
  };

  if (
    excludeWorkshopId
  ) {
    validateObjectId(
      excludeWorkshopId,
      "workshop ID",
    );

    query._id = {
      $ne:
        new mongoose.Types.ObjectId(
          excludeWorkshopId,
        ),
    };
  }

  const existingWorkshop =
    await Workshop.findOne(
      query,
    );

  if (existingWorkshop) {
    throw new AppError(
      "A workshop with this slug already exists.",
      409,
    );
  }
}

async function getWorkshopOrFail(
  workshopId: string,
) {
  validateObjectId(
    workshopId,
    "workshop ID",
  );

  const workshop =
    await Workshop.findById(
      workshopId,
    );

  if (!workshop) {
    throw new AppError(
      "Workshop not found.",
      404,
    );
  }

  return workshop;
}

function handleWorkshopError(
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

  throw error;
}

export async function createWorkshop(
  data: CreateWorkshopInput,
) {
  const title =
    normalizeRequiredText(
      data.title,
      "Workshop title",
    );

  const description =
    normalizeRequiredText(
      data.description,
      "Workshop description",
    );

  const slug =
    normalizeSlug(
      data.slug,
    );

  const reservedCapacity =
    data.reservedCapacity ?? 0;

  validateWorkshopDates(
    data.startDate,
    data.endDate,
  );

  validateWorkshopTimes(
    data.startTime,
    data.endTime,
  );

  validateOnlineDetails(
    data.isOnline,
    data.meetingLink,
    data.location,
  );

  validateRegistrationDeadline(
    data.startDate,
    data.registrationDeadline,
  );

  validateCapacity(
    data.capacity,
    reservedCapacity,
  );

  validateTicketTypes(
    data.ticketTypes,
  );

  const status =
    data.status ?? "draft";

  validatePublishedWorkshop(
    status,
    data.startDate,
  );

  await ensureUniqueSlug(
    slug,
  );

  try {
    return await Workshop.create({
      title,
      slug,
      type: data.type,
      description,

      shortDescription:
        data.shortDescription?.trim(),

      startDate:
        data.startDate,

      endDate:
        data.endDate,

      startTime:
        data.startTime,

      endTime:
        data.endTime,

      location:
        data.location?.trim(),

      isOnline:
        data.isOnline,

      meetingLink:
        data.meetingLink?.trim(),

      capacity:
        data.capacity,

      reservedCapacity,

      registrationRequired:
        data.registrationRequired,

      registrationDeadline:
        data.registrationDeadline,

      ticketTypes:
        toWorkshopTicketDocuments(
          data.ticketTypes,
        ),

      status,

      featuredImage:
        data.featuredImage?.trim(),
    });
  } catch (error) {
    return handleWorkshopError(
      error,
    );
  }
}

export async function getPublishedWorkshops() {
  return Workshop.find({
    status: "published",
  }).sort({
    startDate: 1,
  });
}

export async function getUpcomingWorkshops() {
  return Workshop.find({
    status: "published",
    startDate: {
      $gte: new Date(),
    },
  }).sort({
    startDate: 1,
  });
}

export async function getActiveWorkshops() {
  return Workshop.find({
    status: "published",
  }).sort({
    startDate: 1,
  });
}

export async function getWorkshopById(
  workshopId: string,
) {
  return getWorkshopOrFail(
    workshopId,
  );
}

export async function getWorkshopBySlug(
  slug: string,
) {
  const normalizedSlug =
    normalizeSlug(
      slug,
    );

  const workshop =
    await Workshop.findOne({
      slug: normalizedSlug,
    });

  if (!workshop) {
    throw new AppError(
      "Workshop not found.",
      404,
    );
  }

  return workshop;
}

export async function getAllWorkshops() {
  return Workshop.find()
    .sort({
      startDate: -1,
    });
}

export async function updateWorkshop(
  workshopId: string,
  data: UpdateWorkshopInput,
) {
  const workshop =
    await getWorkshopOrFail(
      workshopId,
    );

  const nextStartDate =
    data.startDate ??
    workshop.startDate;

  const nextEndDate =
    data.endDate ??
    workshop.endDate;

  const nextStartTime =
    data.startTime ??
    workshop.startTime;

  const nextEndTime =
    data.endTime ??
    workshop.endTime;

  const nextIsOnline =
    data.isOnline ??
    workshop.isOnline;

  const nextMeetingLink =
    data.meetingLink ??
    workshop.meetingLink;

  const nextLocation =
    data.location ??
    workshop.location;

  const nextRegistrationDeadline =
    data.registrationDeadline ??
    workshop.registrationDeadline;

  const nextCapacity =
    data.capacity ??
    workshop.capacity;

  const nextReservedCapacity =
    data.reservedCapacity ??
    workshop.reservedCapacity;

  const nextTicketTypes =
    data.ticketTypes ??
    workshop.ticketTypes.map(
      ticketToInput,
    );

  const nextStatus =
    data.status ??
    workshop.status;

  validateWorkshopDates(
    nextStartDate,
    nextEndDate,
  );

  validateWorkshopTimes(
    nextStartTime,
    nextEndTime,
  );

  validateOnlineDetails(
    nextIsOnline,
    nextMeetingLink,
    nextLocation,
  );

  validateRegistrationDeadline(
    nextStartDate,
    nextRegistrationDeadline,
  );

  validateCapacity(
    nextCapacity,
    nextReservedCapacity,
  );

  validateTicketTypes(
    nextTicketTypes,
  );

  validatePublishedWorkshop(
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
      slug !== workshop.slug
    ) {
      await ensureUniqueSlug(
        slug,
        workshopId,
      );

      workshop.slug =
        slug;
    }
  }

  if (
    data.title !== undefined
  ) {
    workshop.title =
      normalizeRequiredText(
        data.title,
        "Workshop title",
      );
  }

  if (
    data.type !== undefined
  ) {
    workshop.type =
      data.type;
  }

  if (
    data.description !==
    undefined
  ) {
    workshop.description =
      normalizeRequiredText(
        data.description,
        "Workshop description",
      );
  }

  if (
    data.shortDescription !==
    undefined
  ) {
    workshop.shortDescription =
      data.shortDescription.trim();
  }

  workshop.startDate =
    nextStartDate;

  workshop.endDate =
    nextEndDate;

  workshop.startTime =
    nextStartTime;

  workshop.endTime =
    nextEndTime;

  if (
    data.location !==
    undefined
  ) {
    workshop.location =
      data.location.trim();
  }

  workshop.isOnline =
    nextIsOnline;

  if (
    data.meetingLink !==
    undefined
  ) {
    workshop.meetingLink =
      data.meetingLink.trim();
  }

  workshop.capacity =
    nextCapacity;

  workshop.reservedCapacity =
    nextReservedCapacity;

  if (
    data.registrationRequired !==
    undefined
  ) {
    workshop.registrationRequired =
      data.registrationRequired;
  }

  workshop.registrationDeadline =
    nextRegistrationDeadline;

  if (
    data.ticketTypes !==
    undefined
  ) {
    workshop.ticketTypes =
      toWorkshopTicketDocuments(
        data.ticketTypes,
      );
  }

  if (
    data.status !==
    undefined
  ) {
    workshop.status =
      data.status;
  }

  if (
    data.featuredImage !==
    undefined
  ) {
    workshop.featuredImage =
      data.featuredImage.trim();
  }

  try {
    await workshop.save();
  } catch (error) {
    return handleWorkshopError(
      error,
    );
  }

  return workshop;
}

export async function updateWorkshopStatus(
  workshopId: string,
  status: WorkshopStatus,
) {
  if (
    !WORKSHOP_STATUSES.includes(
      status,
    )
  ) {
    throw new AppError(
      "Invalid workshop status.",
      400,
    );
  }

  const workshop =
    await getWorkshopOrFail(
      workshopId,
    );

  const currentStatus =
    workshop.status;

  if (
    currentStatus ===
      "completed" &&
    status !== "completed"
  ) {
    throw new AppError(
      "A completed workshop cannot be moved to another status.",
      400,
    );
  }

  if (
    currentStatus ===
      "cancelled" &&
    status !== "cancelled"
  ) {
    throw new AppError(
      "A cancelled workshop cannot be reopened.",
      400,
    );
  }

  if (
    status === "published" &&
    workshop.startDate <=
      new Date()
  ) {
    throw new AppError(
      "A workshop whose start date has passed cannot be published.",
      400,
    );
  }

  workshop.status =
    status;

  try {
    await workshop.save();
  } catch (error) {
    return handleWorkshopError(
      error,
    );
  }

  return workshop;
}

export async function publishWorkshop(
  workshopId: string,
) {
  return updateWorkshopStatus(
    workshopId,
    "published",
  );
}

export async function completeWorkshop(
  workshopId: string,
) {
  const workshop =
    await getWorkshopOrFail(
      workshopId,
    );

  if (
    workshop.status !==
    "published"
  ) {
    throw new AppError(
      "Only a published workshop can be completed.",
      400,
    );
  }

  workshop.status =
    "completed";

  try {
    await workshop.save();
  } catch (error) {
    return handleWorkshopError(
      error,
    );
  }

  return workshop;
}

export async function cancelWorkshop(
  workshopId: string,
) {
  const workshop =
    await getWorkshopOrFail(
      workshopId,
    );

  if (
    workshop.status ===
      "completed" ||
    workshop.status ===
      "cancelled"
  ) {
    throw new AppError(
      "This workshop can no longer be cancelled.",
      400,
    );
  }

  workshop.status =
    "cancelled";

  try {
    await workshop.save();
  } catch (error) {
    return handleWorkshopError(
      error,
    );
  }

  return workshop;
}

export async function getAvailableCapacity(
  workshopId: string,
) {
  const workshop =
    await getWorkshopOrFail(
      workshopId,
    );

  if (
    workshop.capacity ===
    undefined
  ) {
    return null;
  }

  return Math.max(
    workshop.capacity -
      workshop.reservedCapacity,
    0,
  );
}

export async function reserveWorkshopCapacity(
  workshopId: string,
  attendeeCount: number,
) {
  const workshop =
    await getWorkshopOrFail(
      workshopId,
    );

  if (
    !Number.isInteger(
      attendeeCount,
    ) ||
    attendeeCount < 1
  ) {
    throw new AppError(
      "Attendee count must be a whole number greater than zero.",
      400,
    );
  }

  if (
    workshop.capacity ===
    undefined
  ) {
    return workshop;
  }

  const availableCapacity =
    workshop.capacity -
    workshop.reservedCapacity;

  if (
    attendeeCount >
    availableCapacity
  ) {
    throw new AppError(
      "There is not enough workshop capacity available.",
      409,
    );
  }

  workshop.reservedCapacity +=
    attendeeCount;

  try {
    await workshop.save();
  } catch (error) {
    return handleWorkshopError(
      error,
    );
  }

  return workshop;
}

export async function releaseWorkshopCapacity(
  workshopId: string,
  attendeeCount: number,
) {
  const workshop =
    await getWorkshopOrFail(
      workshopId,
    );

  if (
    !Number.isInteger(
      attendeeCount,
    ) ||
    attendeeCount < 1
  ) {
    throw new AppError(
      "Attendee count must be a whole number greater than zero.",
      400,
    );
  }

  workshop.reservedCapacity =
    Math.max(
      workshop.reservedCapacity -
        attendeeCount,
      0,
    );

  try {
    await workshop.save();
  } catch (error) {
    return handleWorkshopError(
      error,
    );
  }

  return workshop;
}

export async function getWorkshopTicket(
  workshopId: string,
  ticketCode: string,
) {
  const workshop =
    await getWorkshopOrFail(
      workshopId,
    );

  const normalizedCode =
    ticketCode
      .trim()
      .toLowerCase();

  if (!normalizedCode) {
    throw new AppError(
      "Workshop ticket code is required.",
      400,
    );
  }

  const ticket =
    workshop.ticketTypes.find(
      (item) =>
        item.code ===
          normalizedCode &&
        item.isActive,
    );

  if (!ticket) {
    throw new AppError(
      "Workshop ticket not found or is no longer available.",
      404,
    );
  }

  return ticket;
}

export async function getWorkshopTicketPrice(
  workshopId: string,
  ticketCode: string,
  currency: Currency,
) {
  if (
    !isSupportedCurrency(
      currency,
    )
  ) {
    throw new AppError(
      `Unsupported payment currency: ${currency}.`,
      400,
    );
  }

  const ticket =
    await getWorkshopTicket(
      workshopId,
      ticketCode,
    );

  const price =
    ticket.pricing.get(
      currency,
    );

  if (!price) {
    throw new AppError(
      `This ticket is not available in ${currency}.`,
      400,
    );
  }

  return {
    code:
      ticket.code,

    name:
      ticket.name,

    attendeeCount:
      ticket.attendeeCount,

    currency,

    amount:
      Number(
        price.toString(),
      ),
  };
}

export async function deleteWorkshop(
  workshopId: string,
) {
  const workshop =
    await getWorkshopOrFail(
      workshopId,
    );

  if (
    workshop.status ===
      "published" ||
    workshop.status ===
      "completed"
  ) {
    throw new AppError(
      "A published or completed workshop cannot be deleted.",
      409,
    );
  }

  if (
    workshop.reservedCapacity >
    0
  ) {
    throw new AppError(
      "A workshop with reserved capacity cannot be deleted.",
      409,
    );
  }

  await workshop.deleteOne();

  return {
    deleted: true,
    workshopId,
  };
}