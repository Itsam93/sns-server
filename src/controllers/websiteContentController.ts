import type { Request, Response } from "express";

import {
  createWebsiteContent,
  deleteWebsiteContent,
  getAllWebsiteContent,
  getPublishedWebsiteContent,
  getPublishedWebsiteContentBySection,
  getWebsiteContentBySection,
  updateWebsiteContent,
  updateWebsiteContentStatus,
} from "../services/websiteContentService.js";

function getSection(
  req: Request,
) {
  const { section } = req.params;

  if (
    typeof section !== "string" ||
    !section.trim()
  ) {
    throw new Error(
      "Website content section is required.",
    );
  }

  return section;
}

export async function create(
  req: Request,
  res: Response,
) {
  const content =
    await createWebsiteContent(
      req.body,
    );

  res.status(201).json({
    success: true,
    message:
      "Website content created successfully.",
    data: content,
  });
}

export async function getPublished(
  _req: Request,
  res: Response,
) {
  const content =
    await getPublishedWebsiteContent();

  res.status(200).json({
    success: true,
    data: content,
  });
}

export async function getPublishedBySection(
  req: Request,
  res: Response,
) {
  const section =
    getSection(req);

  const content =
    await getPublishedWebsiteContentBySection(
      section as
        | "homepage"
        | "about"
        | "organisation"
        | "mission"
        | "vision"
        | "core_values"
        | "founder_message"
        | "contact",
    );

  res.status(200).json({
    success: true,
    data: content,
  });
}

export async function getAll(
  _req: Request,
  res: Response,
) {
  const content =
    await getAllWebsiteContent();

  res.status(200).json({
    success: true,
    data: content,
  });
}

export async function getOne(
  req: Request,
  res: Response,
) {
  const section =
    getSection(req);

  const content =
    await getWebsiteContentBySection(
      section as
        | "homepage"
        | "about"
        | "organisation"
        | "mission"
        | "vision"
        | "core_values"
        | "founder_message"
        | "contact",
    );

  res.status(200).json({
    success: true,
    data: content,
  });
}

export async function update(
  req: Request,
  res: Response,
) {
  const section =
    getSection(req);

  const content =
    await updateWebsiteContent(
      section as
        | "homepage"
        | "about"
        | "organisation"
        | "mission"
        | "vision"
        | "core_values"
        | "founder_message"
        | "contact",
      req.body,
    );

  res.status(200).json({
    success: true,
    message:
      "Website content updated successfully.",
    data: content,
  });
}

export async function updateStatus(
  req: Request,
  res: Response,
) {
  const section =
    getSection(req);

  const content =
    await updateWebsiteContentStatus(
      section as
        | "homepage"
        | "about"
        | "organisation"
        | "mission"
        | "vision"
        | "core_values"
        | "founder_message"
        | "contact",
      req.body.isPublished,
    );

  res.status(200).json({
    success: true,
    message:
      "Website content publication status updated successfully.",
    data: content,
  });
}

export async function remove(
  req: Request,
  res: Response,
) {
  const section =
    getSection(req);

  const result =
    await deleteWebsiteContent(
      section as
        | "homepage"
        | "about"
        | "organisation"
        | "mission"
        | "vision"
        | "core_values"
        | "founder_message"
        | "contact",
    );

  res.status(200).json({
    success: true,
    message:
      "Website content deleted successfully.",
    data: result,
  });
}