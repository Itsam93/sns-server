import type { Request, Response } from "express";

import {
  createResource,
  deleteResource,
  getAllResources,
  getFeaturedResources,
  getLatestResources,
  getPublishedResources,
  getResourceById,
  getResourceBySlug,
  getResourcesByCategory,
  getResourcesByStatus,
  getResourcesByType,
  updateResource,
  updateResourceFeatured,
  updateResourceStatus,
} from "../services/resourceService.js";

function getResourceId(
  req: Request,
) {
  const { id } = req.params;

  if (
    typeof id !== "string" ||
    !id.trim()
  ) {
    throw new Error(
      "Resource ID is required.",
    );
  }

  return id;
}

function getResourceSlug(
  req: Request,
) {
  const { slug } = req.params;

  if (
    typeof slug !== "string" ||
    !slug.trim()
  ) {
    throw new Error(
      "Resource slug is required.",
    );
  }

  return slug;
}

export async function create(
  req: Request,
  res: Response,
) {
  const resource =
    await createResource(
      req.body,
    );

  res.status(201).json({
    success: true,
    message:
      "Resource created successfully.",
    data: resource,
  });
}

export async function getPublished(
  _req: Request,
  res: Response,
) {
  const resources =
    await getPublishedResources();

  res.status(200).json({
    success: true,
    data: resources,
  });
}

export async function getFeatured(
  _req: Request,
  res: Response,
) {
  const resources =
    await getFeaturedResources();

  res.status(200).json({
    success: true,
    data: resources,
  });
}

export async function getLatest(
  req: Request,
  res: Response,
) {
  const rawLimit =
    req.query.limit;

  let limit = 6;

  if (
    typeof rawLimit === "string" &&
    rawLimit.trim()
  ) {
    const parsedLimit =
      Number(rawLimit);

    if (
      !Number.isInteger(
        parsedLimit,
      ) ||
      parsedLimit < 1
    ) {
      res.status(400).json({
        success: false,
        message:
          "Limit must be a positive integer.",
      });
      return;
    }

    limit = parsedLimit;
  }

  const resources =
    await getLatestResources(
      limit,
    );

  res.status(200).json({
    success: true,
    data: resources,
  });
}

export async function getByType(
  req: Request,
  res: Response,
) {
  const { type } = req.params;

  if (
    typeof type !== "string" ||
    !type.trim()
  ) {
    throw new Error(
      "Resource type is required.",
    );
  }

  const resources =
    await getResourcesByType(
      type as
        | "article"
        | "video"
        | "download",
    );

  res.status(200).json({
    success: true,
    data: resources,
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
      "Resource category is required.",
    );
  }

  const resources =
    await getResourcesByCategory(
      category,
    );

  res.status(200).json({
    success: true,
    data: resources,
  });
}

export async function getBySlug(
  req: Request,
  res: Response,
) {
  const slug =
    getResourceSlug(req);

  const resource =
    await getResourceBySlug(
      slug,
    );

  res.status(200).json({
    success: true,
    data: resource,
  });
}

export async function getAll(
  _req: Request,
  res: Response,
) {
  const resources =
    await getAllResources();

  res.status(200).json({
    success: true,
    data: resources,
  });
}

export async function getOne(
  req: Request,
  res: Response,
) {
  const resourceId =
    getResourceId(req);

  const resource =
    await getResourceById(
      resourceId,
    );

  res.status(200).json({
    success: true,
    data: resource,
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
      "Resource status is required.",
    );
  }

  const resources =
    await getResourcesByStatus(
      status as
        | "draft"
        | "published"
        | "archived",
    );

  res.status(200).json({
    success: true,
    data: resources,
  });
}

export async function update(
  req: Request,
  res: Response,
) {
  const resourceId =
    getResourceId(req);

  const resource =
    await updateResource(
      resourceId,
      req.body,
    );

  res.status(200).json({
    success: true,
    message:
      "Resource updated successfully.",
    data: resource,
  });
}

export async function updateStatus(
  req: Request,
  res: Response,
) {
  const resourceId =
    getResourceId(req);

  const resource =
    await updateResourceStatus(
      resourceId,
      req.body.status,
    );

  res.status(200).json({
    success: true,
    message:
      "Resource status updated successfully.",
    data: resource,
  });
}

export async function updateFeatured(
  req: Request,
  res: Response,
) {
  const resourceId =
    getResourceId(req);

  const resource =
    await updateResourceFeatured(
      resourceId,
      req.body.featured,
    );

  res.status(200).json({
    success: true,
    message:
      "Resource featured status updated successfully.",
    data: resource,
  });
}

export async function remove(
  req: Request,
  res: Response,
) {
  const resourceId =
    getResourceId(req);

  const result =
    await deleteResource(
      resourceId,
    );

  res.status(200).json({
    success: true,
    message:
      "Resource deleted successfully.",
    data: result,
  });
}