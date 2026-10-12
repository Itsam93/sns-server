import mongoose from "mongoose";

import {
  Resource,
  type BookFormat,
  type ResourceStatus,
  type ResourceType,
} from "../models/Resource.js";
import { AppError } from "../utils/appError.js";

type CreateResourceInput = {
  title: string;
  slug: string;
  type: ResourceType;
  excerpt?: string;
  content?: string;
  category?: string;
  featuredImage?: string;
  resourceUrl?: string;
  author?: string;
  bookFormat?: BookFormat;
  status?: ResourceStatus;
  featured?: boolean;
};

type UpdateResourceInput = {
  title?: string;
  slug?: string;
  type?: ResourceType;
  excerpt?: string;
  content?: string;
  category?: string;
  featuredImage?: string;
  resourceUrl?: string;
  author?: string;
  bookFormat?: BookFormat;
  featured?: boolean;
};

const RESOURCE_STATUSES: ResourceStatus[] = [
  "draft",
  "published",
  "archived",
];

const RESOURCE_TYPES: ResourceType[] = [
  "article",
  "video",
  "download",
  "book",
];

const STATUS_TRANSITIONS: Record<
  ResourceStatus,
  ResourceStatus[]
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

async function getResourceOrFail(
  resourceId: string,
) {
  validateObjectId(
    resourceId,
    "resource ID",
  );

  const resource =
    await Resource.findById(
      resourceId,
    );

  if (!resource) {
    throw new AppError(
      "Resource not found.",
      404,
    );
  }

  return resource;
}

function validateResourceType(
  type: ResourceType,
  content?: string,
  resourceUrl?: string,
  author?: string,
  bookFormat?: BookFormat,
) {
  if (!RESOURCE_TYPES.includes(type)) {
    throw new AppError(
      "Invalid resource type.",
      400,
    );
  }

  if (
    type === "article" &&
    !content?.trim()
  ) {
    throw new AppError(
      "Article content is required.",
      400,
    );
  }

  if (
    (
      type === "video" ||
      type === "download" ||
      type === "book"
    ) &&
    !resourceUrl?.trim()
  ) {
    throw new AppError(
      "Resource URL is required for videos, downloads, and books.",
      400,
    );
  }

  if (
    type !== "article" &&
    content?.trim()
  ) {
    throw new AppError(
      "Content is only supported for article resources.",
      400,
    );
  }

  if (
    type === "book" &&
    !author?.trim()
  ) {
    throw new AppError(
      "Book author is required.",
      400,
    );
  }

  if (
    type === "book" &&
    !bookFormat
  ) {
    throw new AppError(
      "Book format is required.",
      400,
    );
  }

  if (
    type !== "book" &&
    (author || bookFormat)
  ) {
    throw new AppError(
      "Author and book format are only supported for book resources.",
      400,
    );
  }

  if (
    type === "book" &&
    resourceUrl &&
    !/^https:\/\/(www\.)?amazon\.[a-z.]+\/.+/i.test(
      resourceUrl,
    )
  ) {
    throw new AppError(
      "Books must use a valid Amazon product URL.",
      400,
    );
  }
}

async function ensureUniqueSlug(
  slug: string,
  resourceId?: mongoose.Types.ObjectId,
) {
  const query: {
    slug: string;
    _id?: {
      $ne: mongoose.Types.ObjectId;
    };
  } = {
    slug,
  };

  if (resourceId) {
    query._id = {
      $ne: resourceId,
    };
  }

  const existingResource =
    await Resource.findOne(query);

  if (existingResource) {
    throw new AppError(
      "A resource with this slug already exists.",
      409,
    );
  }
}

export async function createResource(
  data: CreateResourceInput,
) {
  validateResourceType(
    data.type,
    data.content,
    data.resourceUrl,
    data.author,
    data.bookFormat,
  );

  await ensureUniqueSlug(
    data.slug,
  );

  const status =
    data.status ?? "draft";

  if (
    !RESOURCE_STATUSES.includes(
      status,
    )
  ) {
    throw new AppError(
      "Invalid resource status.",
      400,
    );
  }

  if (
    data.featured &&
    status !== "published"
  ) {
    throw new AppError(
      "Only published resources can be featured.",
      409,
    );
  }

  return Resource.create({
    ...data,
    status,
    featured:
      data.featured ?? false,
    publishedAt:
      status === "published"
        ? new Date()
        : undefined,
  });
}

export async function getPublishedResources() {
  return Resource.find({
    status: "published",
  }).sort({
    publishedAt: -1,
    createdAt: -1,
  });
}

export async function getFeaturedResources() {
  return Resource.find({
    status: "published",
    featured: true,
  }).sort({
    publishedAt: -1,
    createdAt: -1,
  });
}

export async function getLatestResources(
  limit = 6,
) {
  const safeLimit = Math.min(
    Math.max(
      Math.trunc(limit),
      1,
    ),
    50,
  );

  return Resource.find({
    status: "published",
  })
    .sort({
      publishedAt: -1,
      createdAt: -1,
    })
    .limit(safeLimit);
}

export async function getResourcesByType(
  type: ResourceType,
) {
  if (
    !RESOURCE_TYPES.includes(type)
  ) {
    throw new AppError(
      "Invalid resource type.",
      400,
    );
  }

  return Resource.find({
    type,
    status: "published",
  }).sort({
    publishedAt: -1,
    createdAt: -1,
  });
}

export async function getResourcesByCategory(
  category: string,
) {
  return Resource.find({
    category,
    status: "published",
  }).sort({
    publishedAt: -1,
    createdAt: -1,
  });
}

export async function getResourceBySlug(
  slug: string,
) {
  const resource =
    await Resource.findOne({
      slug,
      status: "published",
    });

  if (!resource) {
    throw new AppError(
      "Resource not found.",
      404,
    );
  }

  return resource;
}

export async function getAllResources() {
  return Resource.find().sort({
    createdAt: -1,
  });
}

export async function getResourceById(
  resourceId: string,
) {
  return getResourceOrFail(
    resourceId,
  );
}

export async function getResourcesByStatus(
  status: ResourceStatus,
) {
  if (
    !RESOURCE_STATUSES.includes(
      status,
    )
  ) {
    throw new AppError(
      "Invalid resource status.",
      400,
    );
  }

  return Resource.find({
    status,
  }).sort({
    createdAt: -1,
  });
}

export async function updateResource(
  resourceId: string,
  data: UpdateResourceInput,
) {
  const resource =
    await getResourceOrFail(
      resourceId,
    );

  const type =
    data.type ??
    resource.type;

  const content =
    data.content !== undefined
      ? data.content
      : resource.content;

  const resourceUrl =
    data.resourceUrl !== undefined
      ? data.resourceUrl
      : resource.resourceUrl;

  const author =
    data.author !== undefined
      ? data.author
      : resource.author;

  const bookFormat =
    data.bookFormat !== undefined
      ? data.bookFormat
      : resource.bookFormat;

  const typeChanged =
    data.type !== undefined &&
    data.type !== resource.type;

  validateResourceType(
    type,
    typeChanged && type !== "article"
      ? undefined
      : content,
    typeChanged && type === "article"
      ? undefined
      : resourceUrl,
    typeChanged && type !== "book"
      ? undefined
      : author,
    typeChanged && type !== "book"
      ? undefined
      : bookFormat,
  );

  if (
    data.slug &&
    data.slug !== resource.slug
  ) {
    await ensureUniqueSlug(
      data.slug,
      resource._id,
    );
  }

  if (
    data.featured === true &&
    resource.status !== "published"
  ) {
    throw new AppError(
      "Only published resources can be featured.",
      409,
    );
  }

  if (typeChanged) {
    resource.content = undefined;
    resource.author = undefined;
    resource.bookFormat = undefined;
    resource.resourceUrl = undefined;
  }

  Object.assign(
    resource,
    data,
  );

  if (
    resource.status !== "published"
  ) {
    resource.featured = false;
  }

  await resource.save();

  return resource;
}

export async function updateResourceStatus(
  resourceId: string,
  status: ResourceStatus,
) {
  if (
    !RESOURCE_STATUSES.includes(
      status,
    )
  ) {
    throw new AppError(
      "Invalid resource status.",
      400,
    );
  }

  const resource =
    await getResourceOrFail(
      resourceId,
    );

  const currentStatus =
    resource.status;

  if (
    currentStatus !== status
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
        `A resource cannot move from "${currentStatus}" to "${status}".`,
        400,
      );
    }
  }

  if (status === "published") {
    validateResourceType(
      resource.type,
      resource.content,
      resource.resourceUrl,
      resource.author,
      resource.bookFormat,
    );

    if (!resource.publishedAt) {
      resource.publishedAt =
        new Date();
    }
  }

  resource.status = status;

  if (status !== "published") {
    resource.featured = false;
  }

  await resource.save();

  return resource;
}

export async function updateResourceFeatured(
  resourceId: string,
  featured: boolean,
) {
  const resource =
    await getResourceOrFail(
      resourceId,
    );

  if (
    featured &&
    resource.status !== "published"
  ) {
    throw new AppError(
      "Only published resources can be featured.",
      409,
    );
  }

  resource.featured = featured;

  await resource.save();

  return resource;
}

export async function deleteResource(
  resourceId: string,
) {
  const resource =
    await getResourceOrFail(
      resourceId,
    );

  if (resource.status === "published") {
    throw new AppError(
      "Published resources cannot be deleted. Archive the resource instead.",
      409,
    );
  }

  await resource.deleteOne();

  return {
    deleted: true,
    resourceId,
  };
}
