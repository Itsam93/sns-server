import type {
  Request,
  Response,
} from "express";

import {
  getAvailableSlots,
  getAvailableSlotsForDateRange,
} from "../services/slotService.js";

function getQueryString(
  value: unknown,
  fieldName: string,
): string {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      `${fieldName} is required.`,
    );
  }

  return value.trim();
}

function parseDate(
  value: unknown,
  fieldName: string,
): Date {
  const dateString =
    getQueryString(
      value,
      fieldName,
    );

  const date = new Date(
    dateString,
  );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    throw new Error(
      `${fieldName} must be a valid date.`,
    );
  }

  return date;
}

export async function getForDate(
  req: Request,
  res: Response,
) {
  const date = parseDate(
    req.query.date,
    "Date",
  );

  const serviceId =
    getQueryString(
      req.query.serviceId,
      "Service ID",
    );

  const slots =
    await getAvailableSlots(
      date,
      serviceId,
    );

  res.status(200).json({
    success: true,
    data: slots,
  });
}

export async function getForDateRange(
  req: Request,
  res: Response,
) {
  const from = parseDate(
    req.query.from,
    "From date",
  );

  const to = parseDate(
    req.query.to,
    "To date",
  );

  const serviceId =
    getQueryString(
      req.query.serviceId,
      "Service ID",
    );

  if (from > to) {
    res.status(400).json({
      success: false,
      message:
        "The from date must be before the to date.",
    });

    return;
  }

  const results =
    await getAvailableSlotsForDateRange(
      from,
      to,
      serviceId,
    );

  res.status(200).json({
    success: true,
    data: results,
  });
}
