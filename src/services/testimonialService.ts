import mongoose from "mongoose";

import {
  Testimonial,
  type TestimonialStatus,
} from "../models/Testimonial.js";
import { AppError } from "../utils/appError.js";

type CreateTestimonialInput = {
  clientName: string;
  content: string;
  serviceName?: string;
  rating?: number;
  isAnonymous?: boolean;
};

type UpdateTestimonialInput = {
  clientName?: string;
  content?: string;
  serviceName?: string;
  rating?: number;
  isAnonymous?: boolean;
  featured?: boolean;
};

const TESTIMONIAL_STATUSES: TestimonialStatus[] = [
  "pending",
  "approved",
  "published",
  "archived",
];

const STATUS_TRANSITIONS: Record<
  TestimonialStatus,
  TestimonialStatus[]
> = {
  pending: [
    "approved",
    "archived",
  ],

  approved: [
    "published",
    "archived",
    "pending",
  ],

  published: [
    "archived",
  ],

  archived: [
    "approved",
    "pending",
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

async function getTestimonialOrFail(
  testimonialId: string,
) {
  validateObjectId(
    testimonialId,
    "testimonial ID",
  );

  const testimonial =
    await Testimonial.findById(
      testimonialId,
    );

  if (!testimonial) {
    throw new AppError(
      "Testimonial not found.",
      404,
    );
  }

  return testimonial;
}

function validateRating(
  rating?: number,
) {
  if (
    rating === undefined
  ) {
    return;
  }

  if (
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5
  ) {
    throw new AppError(
      "Rating must be an integer between 1 and 5.",
      400,
    );
  }
}

export async function createTestimonial(
  data: CreateTestimonialInput,
) {
  validateRating(data.rating);

  return Testimonial.create({
    clientName:
      data.clientName,

    content:
      data.content,

    serviceName:
      data.serviceName,

    rating:
      data.rating,

    isAnonymous:
      data.isAnonymous ??
      false,

    status: "pending",

    featured: false,
  });
}

export async function getPublishedTestimonials() {
  return Testimonial.find({
    status: "published",
  }).sort({
    featured: -1,
    createdAt: -1,
  });
}

export async function getFeaturedTestimonials() {
  return Testimonial.find({
    status: "published",
    featured: true,
  }).sort({
    createdAt: -1,
  });
}

export async function getAllTestimonials() {
  return Testimonial.find().sort({
    createdAt: -1,
  });
}

export async function getTestimonialById(
  testimonialId: string,
) {
  return getTestimonialOrFail(
    testimonialId,
  );
}

export async function getTestimonialsByStatus(
  status: TestimonialStatus,
) {
  if (
    !TESTIMONIAL_STATUSES.includes(
      status,
    )
  ) {
    throw new AppError(
      "Invalid testimonial status.",
      400,
    );
  }

  return Testimonial.find({
    status,
  }).sort({
    createdAt: -1,
  });
}

export async function updateTestimonial(
  testimonialId: string,
  data: UpdateTestimonialInput,
) {
  const testimonial =
    await getTestimonialOrFail(
      testimonialId,
    );

  validateRating(data.rating);

  if (
    data.clientName !==
    undefined
  ) {
    testimonial.clientName =
      data.clientName;
  }

  if (
    data.content !==
    undefined
  ) {
    testimonial.content =
      data.content;
  }

  if (
    data.serviceName !==
    undefined
  ) {
    testimonial.serviceName =
      data.serviceName;
  }

  if (
    data.rating !==
    undefined
  ) {
    testimonial.rating =
      data.rating;
  }

  if (
    data.isAnonymous !==
    undefined
  ) {
    testimonial.isAnonymous =
      data.isAnonymous;
  }

  if (
    data.featured !==
    undefined
  ) {
    if (
      data.featured &&
      testimonial.status !==
        "published"
    ) {
      throw new AppError(
        "Only published testimonials can be featured.",
        409,
      );
    }

    testimonial.featured =
      data.featured;
  }

  await testimonial.save();

  return testimonial;
}

export async function updateTestimonialStatus(
  testimonialId: string,
  status: TestimonialStatus,
) {
  if (
    !TESTIMONIAL_STATUSES.includes(
      status,
    )
  ) {
    throw new AppError(
      "Invalid testimonial status.",
      400,
    );
  }

  const testimonial =
    await getTestimonialOrFail(
      testimonialId,
    );

  const currentStatus =
    testimonial.status;

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
        `A testimonial cannot move from "${currentStatus}" to "${status}".`,
        400,
      );
    }
  }

  testimonial.status =
    status;

  if (
    status !== "published"
  ) {
    testimonial.featured =
      false;
  }

  await testimonial.save();

  return testimonial;
}

export async function updateTestimonialFeatured(
  testimonialId: string,
  featured: boolean,
) {
  const testimonial =
    await getTestimonialOrFail(
      testimonialId,
    );

  if (
    featured &&
    testimonial.status !==
      "published"
  ) {
    throw new AppError(
      "Only published testimonials can be featured.",
      409,
    );
  }

  testimonial.featured =
    featured;

  await testimonial.save();

  return testimonial;
}

export async function deleteTestimonial(
  testimonialId: string,
) {
  const testimonial =
    await getTestimonialOrFail(
      testimonialId,
    );

  if (
    testimonial.status ===
    "published"
  ) {
    throw new AppError(
      "Published testimonials cannot be deleted. Archive the testimonial instead.",
      409,
    );
  }

  await testimonial.deleteOne();

  return {
    deleted: true,
    testimonialId,
  };
}