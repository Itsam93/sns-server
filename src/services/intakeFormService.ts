import mongoose from "mongoose";

import { Client } from "../models/Client.js";
import { IntakeForm } from "../models/IntakeForm.js";
import { AppError } from "../utils/appError.js";

type IntakeFormInput = {
  reasonForCounselling?: string;
  counsellingGoals?: string;
  previousCounselling?: boolean;
  previousCounsellingDetails?: string;
  additionalInformation?: string;
  consentToTreatment?: boolean;
  consentToDataProcessing?: boolean;
};

function validateObjectId(
  id: string,
  fieldName: string,
) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(
      `Invalid ${fieldName}.`,
      400,
    );
  }
}

async function validateClient(
  clientId: string,
) {
  validateObjectId(clientId, "client ID");

  const client = await Client.findById(
    clientId,
  );

  if (!client) {
    throw new AppError(
      "Client not found.",
      404,
    );
  }

  return client;
}

export async function getMyIntakeForm(
  clientId: string,
) {
  await validateClient(clientId);

  return IntakeForm.findOne({
    clientId,
  });
}

export async function createIntakeForm(
  clientId: string,
  data: IntakeFormInput,
) {
  await validateClient(clientId);

  const existingForm =
    await IntakeForm.findOne({
      clientId,
    });

  if (existingForm) {
    throw new AppError(
      "An intake form already exists for this client.",
      409,
    );
  }

  if (
    data.consentToTreatment !== true
  ) {
    throw new AppError(
      "Consent to treatment is required.",
      400,
    );
  }

  if (
    data.consentToDataProcessing !== true
  ) {
    throw new AppError(
      "Consent to data processing is required.",
      400,
    );
  }

  const intakeForm =
    await IntakeForm.create({
      clientId,
      ...data,
      completedAt: new Date(),
    });

  return intakeForm;
}

export async function updateMyIntakeForm(
  clientId: string,
  data: IntakeFormInput,
) {
  await validateClient(clientId);

  const intakeForm =
    await IntakeForm.findOne({
      clientId,
    });

  if (!intakeForm) {
    throw new AppError(
      "Intake form not found.",
      404,
    );
  }

  if (
    data.reasonForCounselling !==
    undefined
  ) {
    intakeForm.reasonForCounselling =
      data.reasonForCounselling;
  }

  if (
    data.counsellingGoals !== undefined
  ) {
    intakeForm.counsellingGoals =
      data.counsellingGoals;
  }

  if (
    data.previousCounselling !==
    undefined
  ) {
    intakeForm.previousCounselling =
      data.previousCounselling;
  }

  if (
    data.previousCounsellingDetails !==
    undefined
  ) {
    intakeForm.previousCounsellingDetails =
      data.previousCounsellingDetails;
  }

  if (
    data.additionalInformation !==
    undefined
  ) {
    intakeForm.additionalInformation =
      data.additionalInformation;
  }

  if (
    data.consentToTreatment !==
    undefined
  ) {
    if (
      data.consentToTreatment !== true
    ) {
      throw new AppError(
        "Consent to treatment is required.",
        400,
      );
    }

    intakeForm.consentToTreatment =
      data.consentToTreatment;
  }

  if (
    data.consentToDataProcessing !==
    undefined
  ) {
    if (
      data.consentToDataProcessing !==
      true
    ) {
      throw new AppError(
        "Consent to data processing is required.",
        400,
      );
    }

    intakeForm.consentToDataProcessing =
      data.consentToDataProcessing;
  }

  intakeForm.completedAt = new Date();

  await intakeForm.save();

  return intakeForm;
}

/*
 * Admin
 */

export async function getAllIntakeForms() {
  return IntakeForm.find()
    .populate({
      path: "clientId",
      select:
        "firstName lastName phone userId",
      populate: {
        path: "userId",
        select: "email isActive",
      },
    })
    .sort({
      completedAt: -1,
      createdAt: -1,
    });
}

export async function getIntakeFormById(
  intakeFormId: string,
) {
  validateObjectId(
    intakeFormId,
    "intake form ID",
  );

  const intakeForm =
    await IntakeForm.findById(
      intakeFormId,
    ).populate({
      path: "clientId",
      select:
        "firstName lastName phone userId",
      populate: {
        path: "userId",
        select: "email isActive",
      },
    });

  if (!intakeForm) {
    throw new AppError(
      "Intake form not found.",
      404,
    );
  }

  return intakeForm;
}

export async function getClientIntakeForm(
  clientId: string,
) {
  await validateClient(clientId);

  const intakeForm =
    await IntakeForm.findOne({
      clientId,
    }).populate({
      path: "clientId",
      select:
        "firstName lastName phone userId",
      populate: {
        path: "userId",
        select: "email isActive",
      },
    });

  if (!intakeForm) {
    throw new AppError(
      "Intake form not found.",
      404,
    );
  }

  return intakeForm;
}