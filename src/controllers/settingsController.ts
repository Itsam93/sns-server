import type {
  Request,
  Response,
} from "express";

import {
  getSettings,
  updateSettings,
} from "../services/settingsService.js";

export async function get(
  _req: Request,
  res: Response,
) {
  const settings = await getSettings();

  res.status(200).json({
    success: true,
    data: settings,
  });
}

export async function update(
  req: Request,
  res: Response,
) {
  const settings =
    await updateSettings(req.body);

  res.status(200).json({
    success: true,
    message:
      "Settings updated successfully.",
    data: settings,
  });
}