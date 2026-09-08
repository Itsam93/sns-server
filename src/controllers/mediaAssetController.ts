import type { Request, Response } from "express";

import {
  archiveMediaAsset,
  createMediaAsset,
  deleteMediaAsset,
  getAllMediaAssets,
  getMediaAssetById,
  getMediaAssetFolders,
  getMediaAssetsByFolder,
  getMediaAssetsByStatus,
  getMediaAssetsByType,
  updateMediaAsset,
  updateMediaAssetStatus,
} from "../services/mediaAssetService.js";

function getMediaAssetId(
  req: Request,
) {
  const { id } = req.params;

  if (
    typeof id !== "string" ||
    !id.trim()
  ) {
    throw new Error(
      "Media asset ID is required.",
    );
  }

  return id;
}

function getUploadedBy(
  req: Request,
) {
  const userId =
    req.user?.userId;

  if (
    !userId ||
    !userId.trim()
  ) {
    throw new Error(
      "Authenticated user is required.",
    );
  }

  return userId;
}

export async function create(
  req: Request,
  res: Response,
) {
  const mediaAsset =
    await createMediaAsset(
      req.body,
      getUploadedBy(req),
    );

  res.status(201).json({
    success: true,
    message:
      "Media asset created successfully.",
    data: mediaAsset,
  });
}

export async function getAll(
  _req: Request,
  res: Response,
) {
  const mediaAssets =
    await getAllMediaAssets();

  res.status(200).json({
    success: true,
    data: mediaAssets,
  });
}

export async function getOne(
  req: Request,
  res: Response,
) {
  const mediaAssetId =
    getMediaAssetId(req);

  const mediaAsset =
    await getMediaAssetById(
      mediaAssetId,
    );

  res.status(200).json({
    success: true,
    data: mediaAsset,
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
      "Media asset type is required.",
    );
  }

  const mediaAssets =
    await getMediaAssetsByType(
      type as
        | "image"
        | "video"
        | "document"
        | "audio",
    );

  res.status(200).json({
    success: true,
    data: mediaAssets,
  });
}

export async function getByStatus(
  req: Request,
  res: Response,
) {
  const { status } =
    req.params;

  if (
    typeof status !== "string" ||
    !status.trim()
  ) {
    throw new Error(
      "Media asset status is required.",
    );
  }

  const mediaAssets =
    await getMediaAssetsByStatus(
      status as
        | "active"
        | "archived",
    );

  res.status(200).json({
    success: true,
    data: mediaAssets,
  });
}

export async function getByFolder(
  req: Request,
  res: Response,
) {
  const { folder } =
    req.params;

  if (
    typeof folder !== "string" ||
    !folder.trim()
  ) {
    throw new Error(
      "Media folder is required.",
    );
  }

  const mediaAssets =
    await getMediaAssetsByFolder(
      folder,
    );

  res.status(200).json({
    success: true,
    data: mediaAssets,
  });
}

export async function getFolders(
  _req: Request,
  res: Response,
) {
  const folders =
    await getMediaAssetFolders();

  res.status(200).json({
    success: true,
    data: folders,
  });
}

export async function update(
  req: Request,
  res: Response,
) {
  const mediaAssetId =
    getMediaAssetId(req);

  const mediaAsset =
    await updateMediaAsset(
      mediaAssetId,
      req.body,
    );

  res.status(200).json({
    success: true,
    message:
      "Media asset updated successfully.",
    data: mediaAsset,
  });
}

export async function updateStatus(
  req: Request,
  res: Response,
) {
  const mediaAssetId =
    getMediaAssetId(req);

  const mediaAsset =
    await updateMediaAssetStatus(
      mediaAssetId,
      req.body.status,
    );

  res.status(200).json({
    success: true,
    message:
      "Media asset status updated successfully.",
    data: mediaAsset,
  });
}

export async function archive(
  req: Request,
  res: Response,
) {
  const mediaAssetId =
    getMediaAssetId(req);

  const mediaAsset =
    await archiveMediaAsset(
      mediaAssetId,
    );

  res.status(200).json({
    success: true,
    message:
      "Media asset archived successfully.",
    data: mediaAsset,
  });
}

export async function remove(
  req: Request,
  res: Response,
) {
  const mediaAssetId =
    getMediaAssetId(req);

  const result =
    await deleteMediaAsset(
      mediaAssetId,
    );

  res.status(200).json({
    success: true,
    message:
      "Media asset deleted successfully.",
    data: result,
  });
}