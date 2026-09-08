import type { Request, Response } from "express";

import {
  createTestimonial,
  deleteTestimonial,
  getAllTestimonials,
  getFeaturedTestimonials,
  getPublishedTestimonials,
  getTestimonialById,
  getTestimonialsByStatus,
  updateTestimonial,
  updateTestimonialFeatured,
  updateTestimonialStatus,
} from "../services/testimonialService.js";

function getTestimonialId(
  req: Request,
) {
  const { id } = req.params;

  if (
    typeof id !== "string" ||
    !id.trim()
  ) {
    throw new Error(
      "Testimonial ID is required.",
    );
  }

  return id;
}

export async function create(
  req: Request,
  res: Response,
) {
  const testimonial =
    await createTestimonial(
      req.body,
    );

  res.status(201).json({
    success: true,
    message:
      "Testimonial submitted successfully.",
    data: testimonial,
  });
}

export async function getPublished(
  _req: Request,
  res: Response,
) {
  const testimonials =
    await getPublishedTestimonials();

  res.status(200).json({
    success: true,
    data: testimonials,
  });
}

export async function getFeatured(
  _req: Request,
  res: Response,
) {
  const testimonials =
    await getFeaturedTestimonials();

  res.status(200).json({
    success: true,
    data: testimonials,
  });
}

export async function getAll(
  _req: Request,
  res: Response,
) {
  const testimonials =
    await getAllTestimonials();

  res.status(200).json({
    success: true,
    data: testimonials,
  });
}

export async function getByStatus(
  req: Request,
  res: Response,
) {
  const { status } = req.params;

  if (
    typeof status !== "string" ||
    !status.trim()
  ) {
    throw new Error(
      "Testimonial status is required.",
    );
  }

  const testimonials =
    await getTestimonialsByStatus(
      status as
        | "pending"
        | "approved"
        | "published"
        | "archived",
    );

  res.status(200).json({
    success: true,
    data: testimonials,
  });
}

export async function getOne(
  req: Request,
  res: Response,
) {
  const testimonialId =
    getTestimonialId(req);

  const testimonial =
    await getTestimonialById(
      testimonialId,
    );

  res.status(200).json({
    success: true,
    data: testimonial,
  });
}

export async function update(
  req: Request,
  res: Response,
) {
  const testimonialId =
    getTestimonialId(req);

  const testimonial =
    await updateTestimonial(
      testimonialId,
      req.body,
    );

  res.status(200).json({
    success: true,
    message:
      "Testimonial updated successfully.",
    data: testimonial,
  });
}

export async function updateStatus(
  req: Request,
  res: Response,
) {
  const testimonialId =
    getTestimonialId(req);

  const testimonial =
    await updateTestimonialStatus(
      testimonialId,
      req.body.status,
    );

  res.status(200).json({
    success: true,
    message:
      "Testimonial status updated successfully.",
    data: testimonial,
  });
}

export async function updateFeatured(
  req: Request,
  res: Response,
) {
  const testimonialId =
    getTestimonialId(req);

  const testimonial =
    await updateTestimonialFeatured(
      testimonialId,
      req.body.featured,
    );

  res.status(200).json({
    success: true,
    message:
      "Testimonial featured status updated successfully.",
    data: testimonial,
  });
}

export async function remove(
  req: Request,
  res: Response,
) {
  const testimonialId =
    getTestimonialId(req);

  const result =
    await deleteTestimonial(
      testimonialId,
    );

  res.status(200).json({
    success: true,
    message:
      "Testimonial deleted successfully.",
    data: result,
  });
}