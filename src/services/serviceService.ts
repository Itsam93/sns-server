import mongoose from "mongoose";

import {
  Service,
  type IService,
} from "../models/Service.js";
import { AppError } from "../utils/appError.js";

type CreateServiceInput = {
  name: string;
  slug: string;
  description: string;
  durationMinutes: number;
  price?: number;
  currency?: string;
  isActive?: boolean;
};

type UpdateServiceInput = {
  name?: string;
  slug?: string;
  description?: string;
  durationMinutes?: number;
  price?: number;
  currency?: string;
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

function normalizeSlug(
  slug: string,
) {
  return slug
    .trim()
    .toLowerCase();
}

function normalizeCurrency(
  currency: string,
) {
  return currency
    .trim()
    .toUpperCase();
}

async function ensureUniqueSlug(
  slug: string,
  excludeServiceId?: string,
) {
  const query: {
    slug: string;
    _id?: {
      $ne: mongoose.Types.ObjectId;
    };
  } = {
    slug,
  };

  if (excludeServiceId) {
    query._id = {
      $ne: new mongoose.Types.ObjectId(
        excludeServiceId,
      ),
    };
  }

  const existingService =
    await Service.findOne(query);

  if (existingService) {
    throw new AppError(
      "A service with this slug already exists.",
      409,
    );
  }
}

async function getServiceOrFail(
  serviceId: string,
) {
  validateObjectId(
    serviceId,
    "service ID",
  );

  const service =
    await Service.findById(
      serviceId,
    );

  if (!service) {
    throw new AppError(
      "Service not found.",
      404,
    );
  }

  return service;
}

export async function createService(
  data: CreateServiceInput,
) {
  const slug =
    normalizeSlug(data.slug);

  const currency =
    normalizeCurrency(
      data.currency ?? "NGN",
    );

  await ensureUniqueSlug(
    slug,
  );

  try {
    return await Service.create({
      name:
        data.name.trim(),

      slug,

      description:
        data.description.trim(),

      durationMinutes:
        data.durationMinutes,

      price:
        data.price,

      currency,

      isActive:
        data.isActive ?? true,
    });
  } catch (error) {
    if (
      error instanceof
        mongoose.Error.ValidationError
    ) {
      throw new AppError(
        error.message,
        400,
      );
    }

    throw error;
  }
}

export async function getActiveServices() {
  return Service.find({
    isActive: true,
  }).sort({
    name: 1,
  });
}

export async function getAllServices() {
  return Service.find()
    .sort({
      isActive: -1,
      name: 1,
    });
}

export async function getServiceById(
  serviceId: string,
) {
  return getServiceOrFail(
    serviceId,
  );
}

export async function getServiceBySlug(
  slug: string,
) {
  const normalizedSlug =
    normalizeSlug(slug);

  const service =
    await Service.findOne({
      slug: normalizedSlug,
      isActive: true,
    });

  if (!service) {
    throw new AppError(
      "Service not found.",
      404,
    );
  }

  return service;
}

export async function updateService(
  serviceId: string,
  data: UpdateServiceInput,
) {
  const service =
    await getServiceOrFail(
      serviceId,
    );

  if (
    data.slug !== undefined
  ) {
    const slug =
      normalizeSlug(
        data.slug,
      );

    if (
      slug !== service.slug
    ) {
      await ensureUniqueSlug(
        slug,
        serviceId,
      );

      service.slug =
        slug;
    }
  }

  if (
    data.name !== undefined
  ) {
    service.name =
      data.name.trim();
  }

  if (
    data.description !==
    undefined
  ) {
    service.description =
      data.description.trim();
  }

  if (
    data.durationMinutes !==
    undefined
  ) {
    service.durationMinutes =
      data.durationMinutes;
  }

  if (
    data.price !== undefined
  ) {
    service.price =
      data.price;
  }

  if (
    data.currency !==
    undefined
  ) {
    service.currency =
      normalizeCurrency(
        data.currency,
      );
  }

  await service.save();

  return service;
}

export async function updateServiceStatus(
  serviceId: string,
  isActive: boolean,
) {
  const service =
    await getServiceOrFail(
      serviceId,
    );

  service.isActive =
    isActive;

  await service.save();

  return service;
}

export async function activateService(
  serviceId: string,
) {
  return updateServiceStatus(
    serviceId,
    true,
  );
}

export async function deactivateService(
  serviceId: string,
) {
  return updateServiceStatus(
    serviceId,
    false,
  );
}

export async function deleteService(
  serviceId: string,
) {
  const service =
    await getServiceOrFail(
      serviceId,
    );

  await service.deleteOne();

  return {
    deleted: true,
    serviceId,
  };
}