import type { ErrorRequestHandler } from "express";
import mongoose from "mongoose";
import { ZodError } from "zod";

import { AppError } from "../utils/appError.js";

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export const errorMiddleware: ErrorRequestHandler = (
  error,
  _req,
  res,
  _next,
) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors: error.flatten().fieldErrors,
    });

    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });

    return;
  }

  if (error instanceof mongoose.Error.ValidationError) {
    res.status(400).json({
      success: false,
      message: "Invalid request data.",
    });

    return;
  }

  if (error instanceof mongoose.Error.CastError) {
    res.status(400).json({
      success: false,
      message: "Invalid resource identifier.",
    });

    return;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 11000
  ) {
    res.status(409).json({
      success: false,
      message: "A resource with the provided value already exists.",
    });

    return;
  }

  if (!isProduction()) {
    console.error(error);
  } else {
    console.error("Unhandled application error.");
  }

  res.status(500).json({
    success: false,
    message: "Internal server error.",
  });
};