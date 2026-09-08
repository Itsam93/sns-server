import { z } from "zod";

const textField = (
  fieldName: string,
  maxLength: number,
) =>
  z
    .string()
    .trim()
    .max(
      maxLength,
      `${fieldName} must not exceed ${maxLength} characters.`,
    )
    .optional();

export const createIntakeFormSchema =
  z
    .object({
      reasonForCounselling: textField(
        "Reason for counselling",
        5000,
      ),

      counsellingGoals: textField(
        "Counselling goals",
        5000,
      ),

      previousCounselling: z
        .boolean()
        .optional(),

      previousCounsellingDetails:
        textField(
          "Previous counselling details",
          5000,
        ),

      additionalInformation:
        textField(
          "Additional information",
          5000,
        ),

      consentToTreatment: z.boolean(),

      consentToDataProcessing:
        z.boolean(),
    })
    .refine(
      (data) => {
        if (
          data.previousCounselling === true &&
          !data.previousCounsellingDetails?.trim()
        ) {
          return false;
        }

        return true;
      },
      {
        message:
          "Please provide details about your previous counselling experience.",
        path: [
          "previousCounsellingDetails",
        ],
      },
    )
    .refine(
      (data) =>
        data.consentToTreatment === true,
      {
        message:
          "Consent to treatment is required.",
        path: [
          "consentToTreatment",
        ],
      },
    )
    .refine(
      (data) =>
        data.consentToDataProcessing ===
        true,
      {
        message:
          "Consent to data processing is required.",
        path: [
          "consentToDataProcessing",
        ],
      },
    );

export const updateIntakeFormSchema =
  z
    .object({
      reasonForCounselling: textField(
        "Reason for counselling",
        5000,
      ),

      counsellingGoals: textField(
        "Counselling goals",
        5000,
      ),

      previousCounselling: z
        .boolean()
        .optional(),

      previousCounsellingDetails:
        textField(
          "Previous counselling details",
          5000,
        ),

      additionalInformation:
        textField(
          "Additional information",
          5000,
        ),

      consentToTreatment: z
        .boolean()
        .optional(),

      consentToDataProcessing: z
        .boolean()
        .optional(),
    })
    .refine(
      (data) => {
        if (
          data.previousCounselling === true &&
          !data.previousCounsellingDetails?.trim()
        ) {
          return false;
        }

        return true;
      },
      {
        message:
          "Please provide details about your previous counselling experience.",
        path: [
          "previousCounsellingDetails",
        ],
      },
    );

export const intakeFormIdSchema =
  z.object({
    id: z
      .string()
      .trim()
      .min(
        1,
        "Intake form ID is required.",
      ),
  });