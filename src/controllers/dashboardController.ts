import type { Request, Response } from "express";

import {
  getAdminDashboard,
  getClientDashboard,
} from "../services/dashboardService.js";

function getClientId(
  req: Request,
) {
  const clientId =
    req.user?.clientId;

  if (
    !clientId ||
    !clientId.trim()
  ) {
    throw new Error(
      "Client profile is required.",
    );
  }

  return clientId;
}

export async function getAdmin(
  req: Request,
  res: Response,
) {
  const {
    from,
    to,
  } = req.query;

  const dashboard =
    await getAdminDashboard(
      typeof from === "string"
        ? from
        : undefined,
      typeof to === "string"
        ? to
        : undefined,
    );

  res.status(200).json({
    success: true,
    data: dashboard,
  });
}

export async function getClient(
  req: Request,
  res: Response,
) {
  const dashboard =
    await getClientDashboard(
      getClientId(req),
    );

  res.status(200).json({
    success: true,
    data: dashboard,
  });
}