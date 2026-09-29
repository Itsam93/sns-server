import { z } from "zod";

const timeSchema =
  z
    .string()
    .trim()
    .regex(
      /^([01]\d|2[0-3]):([0-5]\d)$/,
      "Time must be in HH:mm format.",
    );

const dateSchema =
  z.coerce.date().refine(
    (date) =>
      !Number.isNaN(
        date.getTime(),
      ),
    {
      message:
        "Date must be valid.",
    },
  );

const futureDateSchema =
  dateSchema.refine(
    (date) =>
      date > new Date(),
    {
      message:
        "Date must be in the future.",
    },
  );

const emailSchema =
  z
    .string()
    .trim()
    .email(
      "Please provide a valid email address.",
    )
    .max(320);

const phoneSchema =
  z
    .string()
    .trim()
    .max(
      30,
      "Phone number must not exceed 30 characters.",
    )
    .optional();

const titleSchema =
  z
    .string()
    .trim()
    .min(
      1,
      "Title is required.",
    )
    .max(200);

const descriptionSchema =
  z
    .string()
    .trim()
    .min(
      1,
      "Description is required.",
    )
    .max(5000);

const slugSchema =
  z
    .string()
    .trim()
    .min(
      1,
      "Slug is required.",
    )
    .max(250)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must contain only lowercase letters, numbers, and hyphens.",
    );

const workshopTypeSchema =
  z.enum([
    "workshop",
    "seminar",
  ]);

const workshopStatusSchema =
  z.enum([
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

const ticketCodeSchema =
  z
    .string()
    .trim()
    .min(
      1,
      "Ticket code is required.",
    )
    .max(50)
    .regex(
      /^[a-z0-9_-]+$/,
      "Ticket code must contain only lowercase letters, numbers, underscores, and hyphens.",
    );

const ticketNameSchema =
  z
    .string()
    .trim()
    .min(
      1,
      "Ticket name is required.",
    )
    .max(150);

const ticketDescriptionSchema =
  z
    .string()
    .trim()
    .max(500)
    .optional();

const ticketAttendeeCountSchema =
  z
    .number()
    .int()
    .min(
      1,
      "Ticket attendee count must be at least 1.",
    );

const ticketPriceSchema =
  z
    .number()
    .finite(
      "Ticket price must be a valid number.",
    )
    .positive(
      "Ticket price must be greater than zero.",
    );

const ticketPricingSchema =
  z
    .object({
      NGN:
        ticketPriceSchema.optional(),

      USD:
        ticketPriceSchema.optional(),
    })
    .refine(
      ({
        NGN,
        USD,
      }) =>
        NGN !== undefined ||
        USD !== undefined,
      {
        message:
          "At least one ticket price is required.",
        path: [
          "NGN",
        ],
      },
    );

const workshopTicketTypeSchema =
  z.object({
    code:
      ticketCodeSchema,

    name:
      ticketNameSchema,

    description:
      ticketDescriptionSchema,

    attendeeCount:
      ticketAttendeeCountSchema,

    pricing:
      ticketPricingSchema,

    isActive:
      z.boolean().optional(),
  });

const workshopTicketsSchema =
  z
    .array(
      workshopTicketTypeSchema,
    )
    .min(
      1,
      "At least one workshop ticket type is required.",
    )
    .superRefine(
      (
        tickets,
        context,
      ) => {
        const codes =
          tickets.map(
            (ticket) =>
              ticket.code,
          );

        const uniqueCodes =
          new Set(codes);

        if (
          uniqueCodes.size !==
          codes.length
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode
                .custom,
            path: [
              "ticketTypes",
            ],
            message:
              "Workshop ticket type codes must be unique.",
          });
        }
      },
    );

const workshopFields = {
  title:
    titleSchema,

  slug:
    slugSchema,

  type:
    workshopTypeSchema,

  description:
    descriptionSchema,

  shortDescription:
    z
      .string()
      .trim()
      .max(500)
      .optional(),

  startDate:
    dateSchema,

  endDate:
    dateSchema.optional(),

  startTime:
    timeSchema.optional(),

  endTime:
    timeSchema.optional(),

  location:
    z
      .string()
      .trim()
      .max(500)
      .optional(),

  isOnline:
    z.boolean(),

  meetingLink:
    z
      .string()
      .trim()
      .url(
        "Meeting link must be a valid URL.",
      )
      .max(1000)
      .optional(),

  capacity:
    z
      .number()
      .int()
      .min(
        1,
        "Capacity must be at least 1.",
      )
      .optional(),

  registrationRequired:
    z.boolean(),

  registrationDeadline:
    dateSchema.optional(),

  ticketTypes:
    workshopTicketsSchema,

  status:
    workshopStatusSchema
      .optional(),

  featuredImage:
    z
      .string()
      .trim()
      .max(1000)
      .optional(),
};

const validateWorkshopDates =
  (
    data: {
      endDate?: Date;
      startDate?: Date;
      startTime?: string;
      endTime?: string;
      registrationDeadline?: Date;
      isOnline?: boolean;
      location?: string;
      meetingLink?: string;
      capacity?: number;
    },
    context: z.RefinementCtx,
  ) => {
    if (
      data.endDate &&
      data.startDate &&
      data.endDate <
        data.startDate
    ) {
      context.addIssue({
        code:
          z.ZodIssueCode.custom,
        path: [
          "endDate",
        ],
        message:
          "End date must not be before the start date.",
      });
    }

    if (
      data.startTime &&
      data.endTime &&
      data.startTime >=
        data.endTime
    ) {
      context.addIssue({
        code:
          z.ZodIssueCode.custom,
        path: [
          "endTime",
        ],
        message:
          "End time must be later than start time.",
      });
    }

    if (
      data.isOnline === true &&
      data.location
    ) {
      context.addIssue({
        code:
          z.ZodIssueCode.custom,
        path: [
          "location",
        ],
        message:
          "Online workshops should not have a physical location.",
      });
    }

    if (
      data.isOnline === true &&
      !data.meetingLink
    ) {
      context.addIssue({
        code:
          z.ZodIssueCode.custom,
        path: [
          "meetingLink",
        ],
        message:
          "Meeting link is required for online workshops.",
      });
    }

    if (
      data.isOnline === false &&
      !data.location
    ) {
      context.addIssue({
        code:
          z.ZodIssueCode.custom,
        path: [
          "location",
        ],
        message:
          "Physical workshops must have a location.",
      });
    }

    if (
      data.registrationDeadline &&
      data.startDate &&
      data.registrationDeadline >
        data.startDate
    ) {
      context.addIssue({
        code:
          z.ZodIssueCode.custom,
        path: [
          "registrationDeadline",
        ],
        message:
          "Registration deadline must not be after the workshop start date.",
      });
    }
  };

export const createWorkshopSchema =
  z
    .object(
      workshopFields,
    )
    .superRefine(
      validateWorkshopDates,
    );

export const updateWorkshopSchema =
  z
    .object(
      workshopFields,
    )
    .partial()
    .superRefine(
      (
        data,
        context,
      ) => {
        if (
          data.endDate &&
          data.startDate &&
          data.endDate <
            data.startDate
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,
            path: [
              "endDate",
            ],
            message:
              "End date must not be before the start date.",
          });
        }

        if (
          data.startTime &&
          data.endTime &&
          data.startTime >=
            data.endTime
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,
            path: [
              "endTime",
            ],
            message:
              "End time must be later than start time.",
          });
        }

        if (
          data.isOnline === true &&
          data.location
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,
            path: [
              "location",
            ],
            message:
              "Online workshops should not have a physical location.",
          });
        }

        if (
          data.isOnline === true &&
          !data.meetingLink
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,
            path: [
              "meetingLink",
            ],
            message:
              "Meeting link is required for online workshops.",
          });
        }

        if (
          data.isOnline === false &&
          !data.location
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,
            path: [
              "location",
            ],
            message:
              "Physical workshops must have a location.",
          });
        }

        if (
          data.registrationDeadline &&
          data.startDate &&
          data.registrationDeadline >
            data.startDate
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,
            path: [
              "registrationDeadline",
            ],
            message:
              "Registration deadline must not be after the workshop start date.",
          });
        }
      },
    );

/*
 * Workshop request
 */

export const createWorkshopRequestSchema =
  z
    .object({
      requesterType:
        z.enum([
          "individual",
          "organisation",
        ]),

      fullName:
        z
          .string()
          .trim()
          .min(
            1,
            "Full name is required.",
          )
          .max(200),

      email:
        emailSchema,

      phone:
        phoneSchema,

      organisationName:
        z
          .string()
          .trim()
          .max(200)
          .optional(),

      proposedTitle:
        titleSchema,

      description:
        descriptionSchema,

      preferredDate:
        futureDateSchema
          .optional(),

      expectedParticipants:
        z
          .number()
          .int()
          .min(
            1,
            "Expected participants must be at least 1.",
          )
          .optional(),

      location:
        z
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
    fullName:
      z
        .string()
        .trim()
        .min(
          1,
          "Full name is required.",
        )
        .max(200),

    email:
      emailSchema,

    phone:
      phoneSchema,

    organisationName:
      z
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
    id:
      z
        .string()
        .trim()
        .min(
          1,
          "Workshop ID is required.",
        ),
  });

export const workshopIdParamSchema =
  z.object({
    workshopId:
      z
        .string()
        .trim()
        .min(
          1,
          "Workshop ID is required.",
        ),
  });

export const workshopRequestIdSchema =
  z.object({
    id:
      z
        .string()
        .trim()
        .min(
          1,
          "Workshop request ID is required.",
        ),
  });

export const workshopParticipantIdSchema =
  z.object({
    id:
      z
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

    adminNote:
      z
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