import { z } from "zod";

const timeSchema = z
  .string()
  .regex(
    /^([01]\d|2[0-3]):[0-5]\d$/,
    "Time must use HH:mm format.",
  );

const organisationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Organisation name is required.")
    .max(250),

  tagline: z
    .string()
    .trim()
    .max(250)
    .optional(),

  description: z
    .string()
    .trim()
    .max(5000)
    .optional(),

  email: z
    .email()
    .max(320)
    .optional(),

  phone: z
    .string()
    .trim()
    .max(30)
    .optional(),

  alternatePhone: z
    .string()
    .trim()
    .max(30)
    .optional(),

  address: z
    .string()
    .trim()
    .max(1000)
    .optional(),

  website: z
    .url()
    .max(500)
    .optional(),
});

const appointmentSchema = z.object({
  minimumAdvanceHours: z
    .number()
    .min(0),

  maximumAdvanceDays: z
    .number()
    .int()
    .min(1),

  defaultSessionDurationMinutes: z
    .number()
    .int()
    .min(15),

  allowClientCancellation: z
    .boolean(),

  cancellationMinimumHours: z
    .number()
    .min(0),

  allowClientRescheduling: z
    .boolean(),

  reschedulingMinimumHours: z
    .number()
    .min(0),
});

const businessHourSchema = z
  .object({
    day: z.enum([
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ]),

    isOpen: z.boolean(),

    openTime: timeSchema.optional(),

    closeTime: timeSchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.isOpen) {
      if (!value.openTime) {
        context.addIssue({
          code: "custom",
          path: ["openTime"],
          message:
            "Opening time is required when the day is open.",
        });
      }

      if (!value.closeTime) {
        context.addIssue({
          code: "custom",
          path: ["closeTime"],
          message:
            "Closing time is required when the day is open.",
        });
      }
    }
  });

const notificationsSchema = z.object({
  emailNotificationsEnabled: z
    .boolean(),

  appointmentConfirmationEnabled: z
    .boolean(),

  appointmentReminderEnabled: z
    .boolean(),

  appointmentReminderHours: z
    .number()
    .int()
    .min(1),

  cancellationNotificationsEnabled: z
    .boolean(),

  workshopNotificationsEnabled: z
    .boolean(),

  contactMessageNotificationsEnabled: z
    .boolean(),
});

const websiteSchema = z.object({
  defaultPageTitle: z
    .string()
    .trim()
    .max(250)
    .optional(),

  defaultMetaDescription: z
    .string()
    .trim()
    .max(500)
    .optional(),

  defaultMetaKeywords: z
    .array(
      z.string().trim().min(1).max(100),
    )
    .optional(),

  maintenanceMode: z
    .boolean(),

  maintenanceMessage: z
    .string()
    .trim()
    .max(1000)
    .optional(),
});

const privacySchema = z.object({
  confidentialityNotice: z
    .string()
    .trim()
    .max(5000)
    .optional(),

  privacyNotice: z
    .string()
    .trim()
    .max(5000)
    .optional(),

  dataRetentionDays: z
    .number()
    .int()
    .min(1),
});

export const updateSettingsSchema =
  z.object({
    organisation:
      organisationSchema.partial().optional(),

    appointment:
      appointmentSchema.partial().optional(),

    businessHours:
      z
        .array(businessHourSchema)
        .length(
          7,
          "Business hours must contain all seven days.",
        )
        .optional(),

    notifications:
      notificationsSchema
        .partial()
        .optional(),

    website:
      websiteSchema.partial().optional(),

    privacy:
      privacySchema.partial().optional(),
  });