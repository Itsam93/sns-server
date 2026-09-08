import type {
  Request,
  Response,
} from "express";

import {
  createIntakeForm,
  getAllIntakeForms,
  getClientIntakeForm,
  getIntakeFormById,
  getMyIntakeForm,
  updateMyIntakeForm,
} from "../services/intakeFormService.js";
import { AppError } from "../utils/appError.js";

function getClientId(req: Request) {
  const clientId = req.user?.clientId;

  if (
    !clientId ||
    !clientId.trim()
  ) {
    throw new AppError(
      "Client profile not found.",
      404,
    );
  }

  return clientId;
}

function getIntakeFormId(
  req: Request,
) {
  const { id } = req.params;

  if (
    typeof id !== "string" ||
    !id.trim()
  ) {
    throw new AppError(
      "Intake form ID is required.",
      400,
    );
  }

  return id;
}

function getRequestedClientId(
  req: Request,
) {
  const { clientId } = req.params;

  if (
    typeof clientId !== "string" ||
    !clientId.trim()
  ) {
    throw new AppError(
      "Client ID is required.",
      400,
    );
  }

  return clientId;
}

/*
 * Client
 */

export async function getMine(
  req: Request,
  res: Response,
) {
  const clientId = getClientId(req);

  const intakeForm =
    await getMyIntakeForm(clientId);

  res.status(200).json({
    success: true,
    data: intakeForm,
  });
}

export async function create(
  req: Request,
  res: Response,
) {
  const clientId = getClientId(req);

  const intakeForm =
    await createIntakeForm(
      clientId,
      req.body,
    );

  res.status(201).json({
    success: true,
    message:
      "Intake form submitted successfully.",
    data: intakeForm,
  });
}

export async function updateMine(
  req: Request,
  res: Response,
) {
  const clientId = getClientId(req);

  const intakeForm =
    await updateMyIntakeForm(
      clientId,
      req.body,
    );

  res.status(200).json({
    success: true,
    message:
      "Intake form updated successfully.",
    data: intakeForm,
  });
}

/*
 * Admin
 */

export async function getAll(
  _req: Request,
  res: Response,
) {
  const intakeForms =
    await getAllIntakeForms();

  res.status(200).json({
    success: true,
    data: intakeForms,
  });
}

export async function getByClient(
  req: Request,
  res: Response,
) {
  const clientId =
    getRequestedClientId(req);

  const intakeForm =
    await getClientIntakeForm(
      clientId,
    );

  res.status(200).json({
    success: true,
    data: intakeForm,
  });
}

export async function getOne(
  req: Request,
  res: Response,
) {
  const intakeFormId =
    getIntakeFormId(req);

  const intakeForm =
    await getIntakeFormById(
      intakeFormId,
    );

  res.status(200).json({
    success: true,
    data: intakeForm,
  });
}