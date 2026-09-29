import { z } from "zod";

const programmeTitleSchema =
  z
    .string()
    .trim()
    .min(
      1,
      "Programme title is required.",
    )
    .max(
      250,
      "Programme title must not exceed 250 characters.",
    );

const programmeSlugSchema =
  z
    .string()
    .trim()
    .min(
      1,
      "Programme slug is required.",
    )
    .max(
      250,
      "Programme slug must not exceed 250 characters.",
    )
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Programme slug must contain only lowercase letters, numbers, and hyphens.",
    );

const programmeDescriptionSchema =
  z
    .string()
    .trim()
    .min(
      1,
      "Programme description is required.",
    )
    .max(
      10000,
      "Programme description must not exceed 10,000 characters.",
    );

const programmeShortDescriptionSchema =
  z
    .string()
    .trim()
    .max(
      500,
      "Programme short description must not exceed 500 characters.",
    )
    .optional();

const programmeDateSchema =
  z.coerce.date({
    message:
      "A valid programme date is required.",
  });

const programmeDurationWeeksSchema =
  z
    .number()
    .int()
    .positive(
      "Programme duration must be greater than zero.",
    );

const programmeCapacitySchema =
  z
    .number()
    .int()
    .positive(
      "Programme capacity must be greater than zero.",
    );

const programmeReservedCapacitySchema =
  z
    .number()
    .int()
    .min(
      0,
      "Reserved capacity cannot be negative.",
    );

const programmeStatusSchema =
  z.enum([
    "draft",
    "published",
    "ongoing",
    "completed",
    "cancelled",
  ]);

const programmePricingCodeSchema =
  z.enum([
    "early_bird",
    "standard",
    "one_on_one",
  ]);

const programmePricingNameSchema =
  z
    .string()
    .trim()
    .min(
      1,
      "Pricing option name is required.",
    )
    .max(
      150,
      "Pricing option name must not exceed 150 characters.",
    );

const programmePricingDescriptionSchema =
  z
    .string()
    .trim()
    .max(
      1000,
      "Pricing option description must not exceed 1,000 characters.",
    )
    .optional();

const programmePriceSchema =
  z
    .number()
    .finite(
      "Programme price must be a valid number.",
    )
    .positive(
      "Programme price must be greater than zero.",
    );

const programmePricingSchema =
  z
    .object({
      NGN:
        programmePriceSchema.optional(),

      USD:
        programmePriceSchema.optional(),

      GBP:
        programmePriceSchema.optional(),
    })
    .refine(
      (data) =>
        data.NGN !== undefined ||
        data.USD !== undefined ||
        data.GBP !== undefined,
      {
        message:
          "At least one programme price in NGN, USD, or GBP is required.",
      },
    );

const programmePricingOptionSchema =
  z
    .object({
      code:
        programmePricingCodeSchema,

      name:
        programmePricingNameSchema,

      description:
        programmePricingDescriptionSchema,

      pricing:
        programmePricingSchema,

      availableFrom:
        programmeDateSchema.optional(),

      availableUntil:
        programmeDateSchema.optional(),

      isActive:
        z.boolean().optional(),
    })
    .superRefine(
      (data, context) => {
        if (
          data.availableFrom &&
          data.availableUntil &&
          data.availableUntil <=
            data.availableFrom
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,
            path: [
              "availableUntil",
            ],
            message:
              "Pricing option availability must end after it begins.",
          });
        }
      },
    );

const programmePricingOptionsSchema =
  z
    .array(
      programmePricingOptionSchema,
    )
    .min(
      1,
      "At least one pricing option is required.",
    )
    .superRefine(
      (pricingOptions, context) => {
        const codes =
          new Set<string>();

        pricingOptions.forEach(
          (pricingOption, index) => {
            if (
              codes.has(
                pricingOption.code,
              )
            ) {
              context.addIssue({
                code:
                  z.ZodIssueCode.custom,
                path: [
                  index,
                  "code",
                ],
                message:
                  "Pricing option codes must be unique.",
              });
            }

            codes.add(
              pricingOption.code,
            );
          },
        );
      },
    );

const programmeGroupDiscountSchema =
  z.object({
    minParticipants:
      z
        .number()
        .int()
        .positive(
          "Minimum participants must be greater than zero.",
        ),

    discountPercent:
      z
        .number()
        .finite(
          "Discount percentage must be a valid number.",
        )
        .min(
          0,
          "Discount percentage cannot be negative.",
        )
        .max(
          100,
          "Discount percentage cannot exceed 100 percent.",
        ),

    isActive:
      z.boolean().optional(),
  });

const programmeGroupDiscountsSchema =
  z
    .array(
      programmeGroupDiscountSchema,
    )
    .superRefine(
      (discounts, context) => {
        const thresholds =
          new Set<number>();

        discounts.forEach(
          (discount, index) => {
            if (
              thresholds.has(
                discount.minParticipants,
              )
            ) {
              context.addIssue({
                code:
                  z.ZodIssueCode.custom,
                path: [
                  index,
                  "minParticipants",
                ],
                message:
                  "Group discount participant thresholds must be unique.",
              });
            }

            thresholds.add(
              discount.minParticipants,
            );
          },
        );
      },
    );

const validateProgrammeDates =
  (
    data: {
      startDate?: Date;
      endDate?: Date;
      pricingOptions?: Array<{
        availableFrom?: Date;
        availableUntil?: Date;
      }>;
    },
    context: z.RefinementCtx,
  ) => {
    if (
      data.startDate &&
      data.endDate &&
      data.endDate <=
        data.startDate
    ) {
      context.addIssue({
        code:
          z.ZodIssueCode.custom,
        path: [
          "endDate",
        ],
        message:
          "Programme end date must be after the start date.",
      });
    }

    if (
      data.pricingOptions &&
      data.startDate &&
      data.endDate
    ) {
      const startDate =
        data.startDate;

      const endDate =
        data.endDate;

      data.pricingOptions.forEach(
        (pricingOption, index) => {
          if (
            pricingOption.availableFrom &&
            pricingOption.availableFrom <
              startDate
          ) {
            context.addIssue({
              code:
                z.ZodIssueCode.custom,
              path: [
                "pricingOptions",
                index,
                "availableFrom",
              ],
              message:
                "Pricing availability cannot begin before the programme start date.",
            });
          }

          if (
            pricingOption.availableUntil &&
            pricingOption.availableUntil >
              endDate
          ) {
            context.addIssue({
              code:
                z.ZodIssueCode.custom,
              path: [
                "pricingOptions",
                index,
                "availableUntil",
              ],
              message:
                "Pricing availability cannot extend beyond the programme end date.",
            });
          }
        },
      );
    }
  };

export const createProgrammeSchema =
  z
    .object({
      title:
        programmeTitleSchema,

      slug:
        programmeSlugSchema,

      description:
        programmeDescriptionSchema,

      shortDescription:
        programmeShortDescriptionSchema,

      startDate:
        programmeDateSchema,

      endDate:
        programmeDateSchema,

      durationWeeks:
        programmeDurationWeeksSchema
          .optional(),

      capacity:
        programmeCapacitySchema
          .optional(),

      reservedCapacity:
        programmeReservedCapacitySchema
          .optional(),

      pricingOptions:
        programmePricingOptionsSchema,

      groupDiscounts:
        programmeGroupDiscountsSchema
          .optional(),

      status:
        programmeStatusSchema
          .optional(),

      featuredImage:
        z
          .string()
          .trim()
          .url(
            "Featured image must be a valid URL.",
          )
          .optional(),
    })
    .superRefine(
      (data, context) => {
        validateProgrammeDates(
          data,
          context,
        );

        if (
          data.capacity !==
            undefined &&
          data.reservedCapacity !==
            undefined &&
          data.reservedCapacity >
            data.capacity
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,
            path: [
              "reservedCapacity",
            ],
            message:
              "Reserved capacity cannot exceed programme capacity.",
          });
        }

        if (
          data.status ===
            "published" &&
          data.startDate <=
            new Date()
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,
            path: [
              "startDate",
            ],
            message:
              "A published programme must have a future start date.",
          });
        }
      },
    );

export const updateProgrammeSchema =
  z
    .object({
      title:
        programmeTitleSchema
          .optional(),

      slug:
        programmeSlugSchema
          .optional(),

      description:
        programmeDescriptionSchema
          .optional(),

      shortDescription:
        programmeShortDescriptionSchema,

      startDate:
        programmeDateSchema
          .optional(),

      endDate:
        programmeDateSchema
          .optional(),

      durationWeeks:
        programmeDurationWeeksSchema
          .optional(),

      capacity:
        programmeCapacitySchema
          .optional(),

      reservedCapacity:
        programmeReservedCapacitySchema
          .optional(),

      pricingOptions:
        programmePricingOptionsSchema
          .optional(),

      groupDiscounts:
        programmeGroupDiscountsSchema
          .optional(),

      status:
        programmeStatusSchema
          .optional(),

      featuredImage:
        z
          .string()
          .trim()
          .url(
            "Featured image must be a valid URL.",
          )
          .optional(),
    })
    .superRefine(
      (data, context) => {
        if (
          data.startDate &&
          data.endDate &&
          data.endDate <=
            data.startDate
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,
            path: [
              "endDate",
            ],
            message:
              "Programme end date must be after the start date.",
          });
        }

        if (
          data.pricingOptions
        ) {
          data.pricingOptions.forEach(
            (
              pricingOption,
              index,
            ) => {
              if (
                pricingOption.availableFrom &&
                pricingOption.availableUntil &&
                pricingOption.availableUntil <=
                  pricingOption.availableFrom
              ) {
                context.addIssue({
                  code:
                    z.ZodIssueCode.custom,
                  path: [
                    "pricingOptions",
                    index,
                    "availableUntil",
                  ],
                  message:
                    "Pricing option availability must end after it begins.",
                });
              }
            },
          );
        }
      },
    );

export const updateProgrammeStatusSchema =
  z.object({
    status:
      programmeStatusSchema,
  });

export const programmeIdSchema =
  z.object({
    id:
      z
        .string()
        .trim()
        .min(
          1,
          "Programme ID is required.",
        ),
  });

export const programmeSlugParamSchema =
  z.object({
    slug:
      programmeSlugSchema,
  });

export const programmeEnrollmentSchema =
  z
    .object({
      programmeId:
        z
          .string()
          .trim()
          .min(
            1,
            "Programme ID is required.",
          ),

      pricingOptionCode:
        programmePricingCodeSchema,

      groupParticipantCount:
        z
          .number()
          .int()
          .min(
            2,
            "Group participant count must be at least 2.",
          )
          .optional(),
    })
    .superRefine(
      (data, context) => {
        if (
          data.pricingOptionCode ===
            "one_on_one" &&
          data.groupParticipantCount !==
            undefined
        ) {
          context.addIssue({
            code:
              z.ZodIssueCode.custom,
            path: [
              "groupParticipantCount",
            ],
            message:
              "One-on-one pricing cannot have a group participant count.",
          });
        }
      },
    );

export const programmeEnrollmentIdSchema =
  z.object({
    id:
      z
        .string()
        .trim()
        .min(
          1,
          "Programme enrollment ID is required.",
        ),
  });