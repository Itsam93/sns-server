import { Router } from "express";

import {
  archive,
  create,
  getAll,
  getByFolder,
  getByStatus,
  getByType,
  getFolders,
  getOne,
  remove,
  update,
  updateStatus,
} from "../controllers/mediaAssetController.js";

import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import {
  createMediaAssetSchema,
  mediaAssetFolderParamSchema,
  mediaAssetIdSchema,
  mediaAssetStatusParamSchema,
  mediaAssetTypeParamSchema,
  updateMediaAssetSchema,
  updateMediaAssetStatusSchema,
} from "../utils/mediaAssetValidation.js";

const router = Router();

/*
 * Admin media asset management
 */

router.use(
  requireAuth,
  requireRole("admin"),
);

router.get(
  "/",
  asyncHandler(getAll),
);

router.get(
  "/folders",
  asyncHandler(getFolders),
);

router.get(
  "/type/:type",
  validate(
    mediaAssetTypeParamSchema,
    "params",
  ),
  asyncHandler(getByType),
);

router.get(
  "/status/:status",
  validate(
    mediaAssetStatusParamSchema,
    "params",
  ),
  asyncHandler(getByStatus),
);

router.get(
  "/folder/:folder",
  validate(
    mediaAssetFolderParamSchema,
    "params",
  ),
  asyncHandler(getByFolder),
);

router.get(
  "/:id",
  validate(
    mediaAssetIdSchema,
    "params",
  ),
  asyncHandler(getOne),
);

router.post(
  "/",
  validate(
    createMediaAssetSchema,
  ),
  asyncHandler(create),
);

router.patch(
  "/:id",
  validate(
    mediaAssetIdSchema,
    "params",
  ),
  validate(
    updateMediaAssetSchema,
  ),
  asyncHandler(update),
);

router.patch(
  "/:id/status",
  validate(
    mediaAssetIdSchema,
    "params",
  ),
  validate(
    updateMediaAssetStatusSchema,
  ),
  asyncHandler(updateStatus),
);

router.patch(
  "/:id/archive",
  validate(
    mediaAssetIdSchema,
    "params",
  ),
  asyncHandler(archive),
);

router.delete(
  "/:id",
  validate(
    mediaAssetIdSchema,
    "params",
  ),
  asyncHandler(remove),
);

export default router;