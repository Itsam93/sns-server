import type { Request, Response } from "express";

import {
  createFAQ,
  deleteFAQ,
  getAllFAQs,
  getFAQById,
  getFAQCategories,
  getFAQsByCategory,
  getFAQsByStatus,
  getFeaturedFAQs,
  getPublishedFAQs,
  updateFAQ,
  updateFAQFeatured,
  updateFAQOrder,
  updateFAQStatus,
} from "../services/faqService.js";

function getFAQId(
  req: Request,
) {
  const { id } = req.params;

  if (
    typeof id !== "string" ||
    !id.trim()
  ) {
    throw new Error(
      "FAQ ID is required.",
    );
  }

  return id;
}

export async function create(
  req: Request,
  res: Response,
) {
  const faq =
    await createFAQ(
      req.body,
    );

  res.status(201).json({
    success: true,
    message:
      "FAQ created successfully.",
    data: faq,
  });
}

export async function getPublished(
  _req: Request,
  res: Response,
) {
  const faqs =
    await getPublishedFAQs();

  res.status(200).json({
    success: true,
    data: faqs,
  });
}

export async function getFeatured(
  _req: Request,
  res: Response,
) {
  const faqs =
    await getFeaturedFAQs();

  res.status(200).json({
    success: true,
    data: faqs,
  });
}

export async function getCategories(
  _req: Request,
  res: Response,
) {
  const categories =
    await getFAQCategories();

  res.status(200).json({
    success: true,
    data: categories,
  });
}

export async function getByCategory(
  req: Request,
  res: Response,
) {
  const { category } = req.params;

  if (
    typeof category !== "string" ||
    !category.trim()
  ) {
    throw new Error(
      "FAQ category is required.",
    );
  }

  const faqs =
    await getFAQsByCategory(
      category,
    );

  res.status(200).json({
    success: true,
    data: faqs,
  });
}

export async function getAll(
  _req: Request,
  res: Response,
) {
  const faqs =
    await getAllFAQs();

  res.status(200).json({
    success: true,
    data: faqs,
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
      "FAQ status is required.",
    );
  }

  const faqs =
    await getFAQsByStatus(
      status as
        | "draft"
        | "published"
        | "archived",
    );

  res.status(200).json({
    success: true,
    data: faqs,
  });
}

export async function getOne(
  req: Request,
  res: Response,
) {
  const faqId =
    getFAQId(req);

  const faq =
    await getFAQById(
      faqId,
    );

  res.status(200).json({
    success: true,
    data: faq,
  });
}

export async function update(
  req: Request,
  res: Response,
) {
  const faqId =
    getFAQId(req);

  const faq =
    await updateFAQ(
      faqId,
      req.body,
    );

  res.status(200).json({
    success: true,
    message:
      "FAQ updated successfully.",
    data: faq,
  });
}

export async function updateStatus(
  req: Request,
  res: Response,
) {
  const faqId =
    getFAQId(req);

  const faq =
    await updateFAQStatus(
      faqId,
      req.body.status,
    );

  res.status(200).json({
    success: true,
    message:
      "FAQ status updated successfully.",
    data: faq,
  });
}

export async function updateFeatured(
  req: Request,
  res: Response,
) {
  const faqId =
    getFAQId(req);

  const faq =
    await updateFAQFeatured(
      faqId,
      req.body.featured,
    );

  res.status(200).json({
    success: true,
    message:
      "FAQ featured status updated successfully.",
    data: faq,
  });
}

export async function updateOrder(
  req: Request,
  res: Response,
) {
  const faqId =
    getFAQId(req);

  const faq =
    await updateFAQOrder(
      faqId,
      req.body.displayOrder,
    );

  res.status(200).json({
    success: true,
    message:
      "FAQ display order updated successfully.",
    data: faq,
  });
}

export async function remove(
  req: Request,
  res: Response,
) {
  const faqId =
    getFAQId(req);

  const result =
    await deleteFAQ(
      faqId,
    );

  res.status(200).json({
    success: true,
    message:
      "FAQ deleted successfully.",
    data: result,
  });
}