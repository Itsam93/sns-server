import type { Request, Response } from "express";

import {
  createWorkshop,
  deleteWorkshop,
  getAllWorkshops,
  getPublishedWorkshops,
  getUpcomingWorkshops,
  getWorkshopById,
  getWorkshopBySlug,
  updateWorkshop,
  updateWorkshopStatus,
} from "../services/workshopService.js";

function getWorkshopId(req: Request) {
  const { id } = req.params;

  if (
    typeof id !== "string" ||
    !id.trim()
  ) {
    throw new Error(
      "Workshop ID is required.",
    );
  }

  return id;
}

function getWorkshopSlug(req: Request) {
  const { slug } = req.params;

  if (
    typeof slug !== "string" ||
    !slug.trim()
  ) {
    throw new Error(
      "Workshop slug is required.",
    );
  }

  return slug;
}

export async function create(
  req: Request,
  res: Response,
) {
  const workshop =
    await createWorkshop(
      req.body,
    );

  res.status(201).json({
    success: true,
    message:
      "Workshop created successfully.",
    data: workshop,
  });
}

export async function getAll(
  _req: Request,
  res: Response,
) {
  const workshops =
    await getAllWorkshops();

  res.status(200).json({
    success: true,
    data: workshops,
  });
}

export async function getPublished(
  _req: Request,
  res: Response,
) {
  const workshops =
    await getPublishedWorkshops();

  res.status(200).json({
    success: true,
    data: workshops,
  });
}

export async function getUpcoming(
  _req: Request,
  res: Response,
) {
  const workshops =
    await getUpcomingWorkshops();

  res.status(200).json({
    success: true,
    data: workshops,
  });
}

export async function getOne(
  req: Request,
  res: Response,
) {
  const workshopId =
    getWorkshopId(req);

  const workshop =
    await getWorkshopById(
      workshopId,
    );

  res.status(200).json({
    success: true,
    data: workshop,
  });
}

export async function getBySlug(
  req: Request,
  res: Response,
) {
  const slug =
    getWorkshopSlug(req);

  const workshop =
    await getWorkshopBySlug(
      slug,
    );

  res.status(200).json({
    success: true,
    data: workshop,
  });
}

export async function update(
  req: Request,
  res: Response,
) {
  const workshopId =
    getWorkshopId(req);

  const workshop =
    await updateWorkshop(
      workshopId,
      req.body,
    );

  res.status(200).json({
    success: true,
    message:
      "Workshop updated successfully.",
    data: workshop,
  });
}

export async function updateStatus(
  req: Request,
  res: Response,
) {
  const workshopId =
    getWorkshopId(req);

  const workshop =
    await updateWorkshopStatus(
      workshopId,
      req.body.status,
    );

  res.status(200).json({
    success: true,
    message:
      "Workshop status updated successfully.",
    data: workshop,
  });
}

export async function remove(
  req: Request,
  res: Response,
) {
  const workshopId =
    getWorkshopId(req);

  const result =
    await deleteWorkshop(
      workshopId,
    );

  res.status(200).json({
    success: true,
    message:
      "Workshop deleted successfully.",
    data: result,
  });
}