import mongoose from "mongoose";

import {
  FAQ,
  type FAQStatus,
} from "../models/FAQ.js";
import { AppError } from "../utils/appError.js";

type CreateFAQInput = {
  question: string;
  answer: string;
  category?: string;
  displayOrder?: number;
  featured?: boolean;
  status?: FAQStatus;
};

type UpdateFAQInput = {
  question?: string;
  answer?: string;
  category?: string;
  displayOrder?: number;
  featured?: boolean;
};

const FAQ_STATUSES: FAQStatus[] = [
  "draft",
  "published",
  "archived",
];

const STATUS_TRANSITIONS: Record<
  FAQStatus,
  FAQStatus[]
> = {
  draft: [
    "published",
    "archived",
  ],

  published: [
    "archived",
    "draft",
  ],

  archived: [
    "draft",
    "published",
  ],
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

async function getFAQOrFail(
  faqId: string,
) {
  validateObjectId(
    faqId,
    "FAQ ID",
  );

  const faq =
    await FAQ.findById(
      faqId,
    );

  if (!faq) {
    throw new AppError(
      "FAQ not found.",
      404,
    );
  }

  return faq;
}

function validateDisplayOrder(
  displayOrder?: number,
) {
  if (
    displayOrder === undefined
  ) {
    return;
  }

  if (
    !Number.isInteger(
      displayOrder,
    ) ||
    displayOrder < 0
  ) {
    throw new AppError(
      "Display order must be a non-negative integer.",
      400,
    );
  }
}

export async function createFAQ(
  data: CreateFAQInput,
) {
  validateDisplayOrder(
    data.displayOrder,
  );

  const status =
    data.status ?? "draft";

  if (
    !FAQ_STATUSES.includes(
      status,
    )
  ) {
    throw new AppError(
      "Invalid FAQ status.",
      400,
    );
  }

  if (
    data.featured &&
    status !== "published"
  ) {
    throw new AppError(
      "Only published FAQs can be featured.",
      409,
    );
  }

  return FAQ.create({
    question:
      data.question,

    answer:
      data.answer,

    category:
      data.category,

    displayOrder:
      data.displayOrder ?? 0,

    featured:
      data.featured ?? false,

    status,

    publishedAt:
      status === "published"
        ? new Date()
        : undefined,
  });
}

export async function getPublishedFAQs() {
  return FAQ.find({
    status: "published",
  }).sort({
    displayOrder: 1,
    createdAt: 1,
  });
}

export async function getFeaturedFAQs() {
  return FAQ.find({
    status: "published",
    featured: true,
  }).sort({
    displayOrder: 1,
    createdAt: 1,
  });
}

export async function getFAQCategories() {
  const categories =
    await FAQ.distinct(
      "category",
      {
        status: "published",
        category: {
          $exists: true,
          $nin: [
            "",
            null,
          ],
        },
      },
    );

  return categories
    .filter(
      (
        category,
      ): category is string =>
        typeof category ===
          "string" &&
        Boolean(
          category.trim(),
        ),
    )
    .sort(
      (
        a,
        b,
      ) =>
        a.localeCompare(b),
    );
}

export async function getFAQsByCategory(
  category: string,
) {
  const normalizedCategory =
    category.trim();

  if (
    !normalizedCategory
  ) {
    throw new AppError(
      "FAQ category is required.",
      400,
    );
  }

  return FAQ.find({
    category:
      normalizedCategory,
    status: "published",
  }).sort({
    displayOrder: 1,
    createdAt: 1,
  });
}

export async function getAllFAQs() {
  return FAQ.find().sort({
    displayOrder: 1,
    createdAt: -1,
  });
}

export async function getFAQById(
  faqId: string,
) {
  return getFAQOrFail(
    faqId,
  );
}

export async function getFAQsByStatus(
  status: FAQStatus,
) {
  if (
    !FAQ_STATUSES.includes(
      status,
    )
  ) {
    throw new AppError(
      "Invalid FAQ status.",
      400,
    );
  }

  return FAQ.find({
    status,
  }).sort({
    displayOrder: 1,
    createdAt: -1,
  });
}

export async function updateFAQ(
  faqId: string,
  data: UpdateFAQInput,
) {
  const faq =
    await getFAQOrFail(
      faqId,
    );

  validateDisplayOrder(
    data.displayOrder,
  );

  if (
    data.question !==
    undefined
  ) {
    faq.question =
      data.question;
  }

  if (
    data.answer !==
    undefined
  ) {
    faq.answer =
      data.answer;
  }

  if (
    data.category !==
    undefined
  ) {
    faq.category =
      data.category;
  }

  if (
    data.displayOrder !==
    undefined
  ) {
    faq.displayOrder =
      data.displayOrder;
  }

  if (
    data.featured !==
    undefined
  ) {
    if (
      data.featured &&
      faq.status !==
        "published"
    ) {
      throw new AppError(
        "Only published FAQs can be featured.",
        409,
      );
    }

    faq.featured =
      data.featured;
  }

  await faq.save();

  return faq;
}

export async function updateFAQStatus(
  faqId: string,
  status: FAQStatus,
) {
  if (
    !FAQ_STATUSES.includes(
      status,
    )
  ) {
    throw new AppError(
      "Invalid FAQ status.",
      400,
    );
  }

  const faq =
    await getFAQOrFail(
      faqId,
    );

  const currentStatus =
    faq.status;

  if (
    currentStatus !==
    status
  ) {
    const allowedTransitions =
      STATUS_TRANSITIONS[
        currentStatus
      ];

    if (
      !allowedTransitions.includes(
        status,
      )
    ) {
      throw new AppError(
        `An FAQ cannot move from "${currentStatus}" to "${status}".`,
        400,
      );
    }
  }

  if (
    status === "published" &&
    !faq.publishedAt
  ) {
    faq.publishedAt =
      new Date();
  }

  faq.status =
    status;

  if (
    status !== "published"
  ) {
    faq.featured =
      false;
  }

  await faq.save();

  return faq;
}

export async function updateFAQFeatured(
  faqId: string,
  featured: boolean,
) {
  const faq =
    await getFAQOrFail(
      faqId,
    );

  if (
    featured &&
    faq.status !==
      "published"
  ) {
    throw new AppError(
      "Only published FAQs can be featured.",
      409,
    );
  }

  faq.featured =
    featured;

  await faq.save();

  return faq;
}

export async function updateFAQOrder(
  faqId: string,
  displayOrder: number,
) {
  validateDisplayOrder(
    displayOrder,
  );

  const faq =
    await getFAQOrFail(
      faqId,
    );

  faq.displayOrder =
    displayOrder;

  await faq.save();

  return faq;
}

export async function deleteFAQ(
  faqId: string,
) {
  const faq =
    await getFAQOrFail(
      faqId,
    );

  if (
    faq.status ===
    "published"
  ) {
    throw new AppError(
      "Published FAQs cannot be deleted. Archive the FAQ instead.",
      409,
    );
  }

  await faq.deleteOne();

  return {
    deleted: true,
    faqId,
  };
}