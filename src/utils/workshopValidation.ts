import { z } from "zod";

const timeSchema = z
  .string()
  .trim()
  .regex(
    /^([01]\d|2[0-3]):([0-5]\d)$/,
    "Time must be in HH:mm format.",
  );

const futureDateSchema = z.coerce
  .date()
  .refine(
    (date) => !Number.isNaN(date.getTime()),
    {
      message: "Date must be valid.",
    },
  );

const emailSchema = z
  .string()
  .trim()
  .email(
    "Please provide a valid email address.",
  )
  .max(320);

const phoneSchema = z
  .string()
  .trim()
  .max(
    30,
    "Phone number must not exceed 30 characters.",
  )
  .optional();

const titleSchema = z
  .string()
  .trim()
  .min(1, "Title is required.")
  .max(200);

const descriptionSchema = z
  .string()
  .trim()
  .min(1, "Description is required.")
  .max(5000);

const slugSchema = z
  .string()
  .trim()
  .min(1, "Slug is required.")
  .max(250)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must contain only lowercase letters, numbers, and hyphens.",
  );

const workshopTypeSchema = z.enum([
  "workshop",
  "seminar",
]);

const workshopStatusSchema = z.enum([
  "draft",
  "published",
  "completed",
  "cancelled",
]);

const workshopRequestStatusSchema =
  z.enum([
    "pending",
    "reviewing",
    "approved",
    "rejected",
    "completed",
    "cancelled",
  ]);

const workshopParticipantStatusSchema =
  z.enum([
    "registered",
    "attended",
    "cancelled",
    "no_show",
  ]);

/*
 * Workshop
 */

const workshopFields = {
  title: titleSchema,

  slug: slugSchema,

  type: workshopTypeSchema,

  description:
    descriptionSchema,

  shortDescription: z
    .string()
    .trim()
    .max(500)
    .optional(),

  startDate:
    futureDateSchema,

  endDate:
    futureDateSchema.optional(),

  startTime:
    timeSchema.optional(),

  endTime:
    timeSchema.optional(),

  location: z
    .string()
    .trim()
    .max(500)
    .optional(),

  isOnline:
    z.boolean().optional(),

  meetingLink: z
    .string()
    .trim()
    .url(
      "Meeting link must be a valid URL.",
    )
    .max(1000)
    .optional(),

  capacity: z
    .number()
    .int()
    .min(
      1,
      "Capacity must be at least 1.",
    )
    .optional(),

  registrationRequired:
    z.boolean().optional(),

  registrationDeadline:
    futureDateSchema.optional(),

  status:
    workshopStatusSchema.optional(),

  featuredImage: z
    .string()
    .trim()
    .max(1000)
    .optional(),
};

const workshopValidation =
  z.object(workshopFields);

export const createWorkshopSchema =
  workshopValidation
    .refine(
      ({ endDate, startDate }) =>
        !endDate ||
        endDate >= startDate,
      {
        message:
          "End date must not be before the start date.",
        path: ["endDate"],
      },
    )
    .refine(
      ({ startTime, endTime }) =>
        !startTime ||
        !endTime ||
        startTime < endTime,
      {
        message:
          "End time must be later than start time.",
        path: ["endTime"],
      },
    )
    .refine(
      ({ isOnline, location }) =>
        !isOnline || !location,
      {
        message:
          "Online workshops should not have a physical location.",
        path: ["location"],
      },
    )
    .refine(
      ({
        isOnline,
        meetingLink,
      }) =>
        !isOnline ||
        Boolean(meetingLink),
      {
        message:
          "Meeting link is required for online workshops.",
        path: ["meetingLink"],
      },
    )
    .refine(
      ({
        registrationDeadline,
        startDate,
      }) =>
        !registrationDeadline ||
        registrationDeadline <=
          startDate,
      {
        message:
          "Registration deadline must not be after the workshop start date.",
        path: [
          "registrationDeadline",
        ],
      },
    );

export const updateWorkshopSchema =
  z
    .object(workshopFields)
    .partial()
    .refine(
      ({
        endDate,
        startDate,
      }) =>
        !endDate ||
        !startDate ||
        endDate >= startDate,
      {
        message:
          "End date must not be before the start date.",
        path: ["endDate"],
      },
    )
    .refine(
      ({
        startTime,
        endTime,
      }) =>
        !startTime ||
        !endTime ||
        startTime < endTime,
      {
        message:
          "End time must be later than start time.",
        path: ["endTime"],
      },
    )
    .refine(
      ({
        isOnline,
        location,
      }) =>
        isOnline !== true ||
        !location,
      {
        message:
          "Online workshops should not have a physical location.",
        path: ["location"],
      },
    )
    .refine(
      ({
        isOnline,
        meetingLink,
      }) =>
        isOnline !== true ||
        Boolean(meetingLink),
      {
        message:
          "Meeting link is required for online workshops.",
        path: ["meetingLink"],
      },
    )
    .refine(
      ({
        registrationDeadline,
        startDate,
      }) =>
        !registrationDeadline ||
        !startDate ||
        registrationDeadline <=
          startDate,
      {
        message:
          "Registration deadline must not be after the workshop start date.",
        path: [
          "registrationDeadline",
        ],
      },
    );

/*
 * Workshop request
 */

export const createWorkshopRequestSchema =
  z
    .object({
      requesterType: z.enum([
        "individual",
        "organisation",
      ]),

      fullName: z
        .string()
        .trim()
        .min(
          1,
          "Full name is required.",
        )
        .max(200),

      email: emailSchema,

      phone: phoneSchema,

      organisationName: z
        .string()
        .trim()
        .max(200)
        .optional(),

      proposedTitle:
        titleSchema,

      description:
        descriptionSchema,

      preferredDate:
        futureDateSchema.optional(),

      expectedParticipants: z
        .number()
        .int()
        .min(
          1,
          "Expected participants must be at least 1.",
        )
        .optional(),

      location: z
        .string()
        .trim()
        .max(500)
        .optional(),

      isOnline:
        z.boolean().optional(),

      additionalInformation:
        z
          .string()
          .trim()
          .max(5000)
          .optional(),
    })
    .refine(
      ({
        requesterType,
        organisationName,
      }) =>
        requesterType !==
          "organisation" ||
        Boolean(
          organisationName?.trim(),
        ),
      {
        message:
          "Organisation name is required for organisation requests.",
        path: [
          "organisationName",
        ],
      },
    );

/*
 * Workshop participant
 */

export const createWorkshopParticipantSchema =
  z.object({
    fullName: z
      .string()
      .trim()
      .min(
        1,
        "Full name is required.",
      )
      .max(200),

    email: emailSchema,

    phone: phoneSchema,

    organisationName: z
      .string()
      .trim()
      .max(200)
      .optional(),
  });

/*
 * IDs
 */

export const workshopIdSchema =
  z.object({
    id: z
      .string()
      .trim()
      .min(
        1,
        "Workshop ID is required.",
      ),
  });

export const workshopIdParamSchema =
  z.object({
    workshopId: z
      .string()
      .trim()
      .min(
        1,
        "Workshop ID is required.",
      ),
  });

export const workshopRequestIdSchema =
  z.object({
    id: z
      .string()
      .trim()
      .min(
        1,
        "Workshop request ID is required.",
      ),
  });

export const workshopParticipantIdSchema =
  z.object({
    id: z
      .string()
      .trim()
      .min(
        1,
        "Workshop participant ID is required.",
      ),
  });

/*
 * Admin status updates
 */

export const updateWorkshopStatusSchema =
  z.object({
    status:
      workshopStatusSchema,
  });

export const updateWorkshopRequestStatusSchema =
  z.object({
    status:
      workshopRequestStatusSchema,

    adminNote: z
      .string()
      .trim()
      .max(3000)
      .optional(),
  });

export const updateParticipantStatusSchema =
  z.object({
    status:
      workshopParticipantStatusSchema,
  });