import mongoose from "mongoose";

import {
  MediaAsset,
  type MediaAssetStatus,
  type MediaAssetType,
} from "../models/MediaAsset.js";
import { AppError } from "../utils/appError.js";

type CreateMediaAssetInput = {
  name: string;
  originalName: string;
  type: MediaAssetType;
  mimeType: string;
  url: string;
  publicId?: string;
  size?: number;
  width?: number;
  height?: number;
  altText?: string;
  description?: string;
  folder?: string;
  status?: MediaAssetStatus;
};

type UpdateMediaAssetInput = {
  name?: string;
  altText?: string;
  description?: string;
  folder?: string;
};

const MEDIA_ASSET_TYPES: MediaAssetType[] = [
  "image",
  "video",
  "document",
  "audio",
];

const MEDIA_ASSET_STATUSES: MediaAssetStatus[] = [
  "active",
  "archived",
];

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

function validateMediaType(
  type: MediaAssetType,
) {
  if (
    !MEDIA_ASSET_TYPES.includes(
      type,
    )
  ) {
    throw new AppError(
      "Invalid media asset type.",
      400,
    );
  }
}

function validateMediaStatus(
  status: MediaAssetStatus,
) {
  if (
    !MEDIA_ASSET_STATUSES.includes(
      status,
    )
  ) {
    throw new AppError(
      "Invalid media asset status.",
      400,
    );
  }
}

function validateImageDimensions(
  type: MediaAssetType,
  width?: number,
  height?: number,
) {
  if (
    type === "image" &&
    (width === undefined ||
      height === undefined)
  ) {
    throw new AppError(
      "Width and height are required for image assets.",
      400,
    );
  }
}

async function getMediaAssetOrFail(
  mediaAssetId: string,
) {
  validateObjectId(
    mediaAssetId,
    "media asset ID",
  );

  const mediaAsset =
    await MediaAsset.findById(
      mediaAssetId,
    );

  if (!mediaAsset) {
    throw new AppError(
      "Media asset not found.",
      404,
    );
  }

  return mediaAsset;
}

export async function createMediaAsset(
  data: CreateMediaAssetInput,
  uploadedBy: string,
) {
  validateObjectId(
    uploadedBy,
    "uploader ID",
  );

  validateMediaType(
    data.type,
  );

  validateImageDimensions(
    data.type,
    data.width,
    data.height,
  );

  const status =
    data.status ?? "active";

  validateMediaStatus(status);

  return MediaAsset.create({
    name:
      data.name,

    originalName:
      data.originalName,

    type:
      data.type,

    mimeType:
      data.mimeType,

    url:
      data.url,

    publicId:
      data.publicId,

    size:
      data.size,

    width:
      data.width,

    height:
      data.height,

    altText:
      data.altText,

    description:
      data.description,

    folder:
      data.folder,

    status,

    uploadedBy,
  });
}

export async function getAllMediaAssets() {
  return MediaAsset.find()
    .populate(
      "uploadedBy",
      "email role",
    )
    .sort({
      createdAt: -1,
    });
}

export async function getMediaAssetById(
  mediaAssetId: string,
) {
  return getMediaAssetOrFail(
    mediaAssetId,
  );
}

export async function getMediaAssetsByType(
  type: MediaAssetType,
) {
  validateMediaType(type);

  return MediaAsset.find({
    type,
    status: "active",
  }).sort({
    createdAt: -1,
  });
}

export async function getMediaAssetsByStatus(
  status: MediaAssetStatus,
) {
  validateMediaStatus(status);

  return MediaAsset.find({
    status,
  }).sort({
    createdAt: -1,
  });
}

export async function getMediaAssetsByFolder(
  folder: string,
) {
  const normalizedFolder =
    folder.trim();

  if (!normalizedFolder) {
    throw new AppError(
      "Media folder is required.",
      400,
    );
  }

  return MediaAsset.find({
    folder:
      normalizedFolder,
    status: "active",
  }).sort({
    createdAt: -1,
  });
}

export async function getMediaAssetFolders() {
  const folders =
    await MediaAsset.distinct(
      "folder",
      {
        status: "active",
        folder: {
          $exists: true,
          $nin: [
            "",
            null,
          ],
        },
      },
    );

  return folders
    .filter(
      (
        folder,
      ): folder is string =>
        typeof folder ===
          "string" &&
        Boolean(
          folder.trim(),
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

export async function updateMediaAsset(
  mediaAssetId: string,
  data: UpdateMediaAssetInput,
) {
  const mediaAsset =
    await getMediaAssetOrFail(
      mediaAssetId,
    );

  if (
    data.name !==
    undefined
  ) {
    mediaAsset.name =
      data.name;
  }

  if (
    data.altText !==
    undefined
  ) {
    mediaAsset.altText =
      data.altText;
  }

  if (
    data.description !==
    undefined
  ) {
    mediaAsset.description =
      data.description;
  }

  if (
    data.folder !==
    undefined
  ) {
    mediaAsset.folder =
      data.folder;
  }

  await mediaAsset.save();

  return mediaAsset;
}

export async function updateMediaAssetStatus(
  mediaAssetId: string,
  status: MediaAssetStatus,
) {
  validateMediaStatus(status);

  const mediaAsset =
    await getMediaAssetOrFail(
      mediaAssetId,
    );

  mediaAsset.status =
    status;

  await mediaAsset.save();

  return mediaAsset;
}

export async function archiveMediaAsset(
  mediaAssetId: string,
) {
  return updateMediaAssetStatus(
    mediaAssetId,
    "archived",
  );
}

export async function deleteMediaAsset(
  mediaAssetId: string,
) {
  const mediaAsset =
    await getMediaAssetOrFail(
      mediaAssetId,
    );

  if (
    mediaAsset.status ===
    "active"
  ) {
    throw new AppError(
      "Active media assets cannot be deleted. Archive the asset first.",
      409,
    );
  }

  await mediaAsset.deleteOne();

  return {
    deleted: true,
    mediaAssetId,
  };
}