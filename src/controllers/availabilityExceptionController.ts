import type {
  Request,
  Response,
} from "express";

import {
  createException,
  deleteException,
  getAllExceptions,
  getExceptionById,
  getExceptions,
  updateException,
} from "../services/availabilityExceptionService.js";

function getExceptionId(
  req: Request,
) {
  const { id } = req.params;

  if (
    typeof id !== "string" ||
    !id
  ) {
    throw new Error(
      "Availability exception ID is required.",
    );
  }

  return id;
}

function parseDateQuery(
  value: unknown,
) {
  if (
    value === undefined ||
    value === ""
  ) {
    return undefined;
  }

  if (
    typeof value !== "string"
  ) {
    throw new Error(
      "Invalid date query parameter.",
    );
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(
      "Invalid date query parameter.",
    );
  }

  return date;
}

export async function getAll(
  _req: Request,
  res: Response,
) {
  const exceptions =
    await getAllExceptions();

  res.status(200).json({
    success: true,
    data: exceptions,
  });
}

export async function getByDateRange(
  req: Request,
  res: Response,
) {
  const from = parseDateQuery(
    req.query.from,
  );

  const to = parseDateQuery(
    req.query.to,
  );

  if (from && to && from > to) {
    res.status(400).json({
      success: false,
      message:
        "The from date must be before the to date.",
    });

    return;
  }

  const exceptions =
    await getExceptions({
      from,
      to,
    });

  res.status(200).json({
    success: true,
    data: exceptions,
  });
}

export async function getOne(
  req: Request,
  res: Response,
) {
  const exception =
    await getExceptionById(
      getExceptionId(req),
    );

  res.status(200).json({
    success: true,
    data: exception,
  });
}

export async function create(
  req: Request,
  res: Response,
) {
  const exception =
    await createException(
      req.body,
    );

  res.status(201).json({
    success: true,
    message:
      "Availability exception created successfully.",
    data: exception,
  });
}

export async function update(
  req: Request,
  res: Response,
) {
  const exception =
    await updateException(
      getExceptionId(req),
      req.body,
    );

  res.status(200).json({
    success: true,
    message:
      "Availability exception updated successfully.",
    data: exception,
  });
}

export async function remove(
  req: Request,
  res: Response,
) {
  await deleteException(
    getExceptionId(req),
  );

  res.status(200).json({
    success: true,
    message:
      "Availability exception deleted successfully.",
  });
}