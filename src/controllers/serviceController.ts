import type { Request, Response } from "express";

import {
  activateService,
  createService,
  deactivateService,
  deleteService,
  getActiveServices,
  getAllServices,
  getServiceById,
  getServiceBySlug,
  updateService,
  updateServiceStatus,
} from "../services/serviceService.js";

function getServiceId(
  req: Request,
) {
  const { id } = req.params;

  if (
    typeof id !== "string" ||
    !id.trim()
  ) {
    throw new Error(
      "Service ID is required.",
    );
  }

  return id;
}

export async function create(
  req: Request,
  res: Response,
) {
  const service =
    await createService(
      req.body,
    );

  res.status(201).json({
    success: true,
    message:
      "Service created successfully.",
    data: service,
  });
}

export async function getActive(
  _req: Request,
  res: Response,
) {
  const services =
    await getActiveServices();

  res.status(200).json({
    success: true,
    data: services,
  });
}

export async function getAll(
  _req: Request,
  res: Response,
) {
  const services =
    await getAllServices();

  res.status(200).json({
    success: true,
    data: services,
  });
}

export async function getOne(
  req: Request,
  res: Response,
) {
  const serviceId =
    getServiceId(req);

  const service =
    await getServiceById(
      serviceId,
    );

  res.status(200).json({
    success: true,
    data: service,
  });
}

export async function getBySlug(
  req: Request,
  res: Response,
) {
  const { slug } =
    req.params;

  if (
    typeof slug !== "string" ||
    !slug.trim()
  ) {
    throw new Error(
      "Service slug is required.",
    );
  }

  const service =
    await getServiceBySlug(
      slug,
    );

  res.status(200).json({
    success: true,
    data: service,
  });
}

export async function update(
  req: Request,
  res: Response,
) {
  const serviceId =
    getServiceId(req);

  const service =
    await updateService(
      serviceId,
      req.body,
    );

  res.status(200).json({
    success: true,
    message:
      "Service updated successfully.",
    data: service,
  });
}

export async function updateStatus(
  req: Request,
  res: Response,
) {
  const serviceId =
    getServiceId(req);

  const service =
    await updateServiceStatus(
      serviceId,
      req.body.isActive,
    );

  res.status(200).json({
    success: true,
    message:
      "Service status updated successfully.",
    data: service,
  });
}

export async function activate(
  req: Request,
  res: Response,
) {
  const serviceId =
    getServiceId(req);

  const service =
    await activateService(
      serviceId,
    );

  res.status(200).json({
    success: true,
    message:
      "Service activated successfully.",
    data: service,
  });
}

export async function deactivate(
  req: Request,
  res: Response,
) {
  const serviceId =
    getServiceId(req);

  const service =
    await deactivateService(
      serviceId,
    );

  res.status(200).json({
    success: true,
    message:
      "Service deactivated successfully.",
    data: service,
  });
}

export async function remove(
  req: Request,
  res: Response,
) {
  const serviceId =
    getServiceId(req);

  const result =
    await deleteService(
      serviceId,
    );

  res.status(200).json({
    success: true,
    message:
      "Service deleted successfully.",
    data: result,
  });
}