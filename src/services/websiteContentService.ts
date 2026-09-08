import {
  WebsiteContent,
  type WebsiteContentSection,
} from "../models/WebsiteContent.js";
import { AppError } from "../utils/appError.js";

type CreateWebsiteContentInput = {
  section: WebsiteContentSection;
  title?: string;
  content: string;
  metadata?: Record<string, unknown>;
  isPublished?: boolean;
};

type UpdateWebsiteContentInput = {
  title?: string;
  content?: string;
  metadata?: Record<string, unknown>;
  isPublished?: boolean;
};

const WEBSITE_CONTENT_SECTIONS: WebsiteContentSection[] = [
  "homepage",
  "about",
  "organisation",
  "mission",
  "vision",
  "core_values",
  "founder_message",
  "contact",
];

function validateSection(
  section: WebsiteContentSection,
) {
  if (
    !WEBSITE_CONTENT_SECTIONS.includes(
      section,
    )
  ) {
    throw new AppError(
      "Invalid website content section.",
      400,
    );
  }
}

async function getContentBySectionOrFail(
  section: WebsiteContentSection,
) {
  validateSection(section);

  const content =
    await WebsiteContent.findOne({
      section,
    });

  if (!content) {
    throw new AppError(
      "Website content not found.",
      404,
    );
  }

  return content;
}

export async function createWebsiteContent(
  data: CreateWebsiteContentInput,
) {
  validateSection(data.section);

  const existingContent =
    await WebsiteContent.findOne({
      section: data.section,
    });

  if (existingContent) {
    throw new AppError(
      `Website content for the "${data.section}" section already exists.`,
      409,
    );
  }

  return WebsiteContent.create({
    section:
      data.section,

    title:
      data.title,

    content:
      data.content,

    metadata:
      data.metadata,

    isPublished:
      data.isPublished ??
      false,
  });
}

export async function getPublishedWebsiteContent() {
  return WebsiteContent.find({
    isPublished: true,
  }).sort({
    section: 1,
  });
}

export async function getPublishedWebsiteContentBySection(
  section: WebsiteContentSection,
) {
  validateSection(section);

  const content =
    await WebsiteContent.findOne({
      section,
      isPublished: true,
    });

  if (!content) {
    throw new AppError(
      "Published website content not found.",
      404,
    );
  }

  return content;
}

export async function getAllWebsiteContent() {
  return WebsiteContent.find().sort({
    section: 1,
  });
}

export async function getWebsiteContentBySection(
  section: WebsiteContentSection,
) {
  return getContentBySectionOrFail(
    section,
  );
}

export async function updateWebsiteContent(
  section: WebsiteContentSection,
  data: UpdateWebsiteContentInput,
) {
  const content =
    await getContentBySectionOrFail(
      section,
    );

  if (
    data.title !==
    undefined
  ) {
    content.title =
      data.title;
  }

  if (
    data.content !==
    undefined
  ) {
    content.content =
      data.content;
  }

  if (
    data.metadata !==
    undefined
  ) {
    content.metadata =
      data.metadata;
  }

  if (
    data.isPublished !==
    undefined
  ) {
    content.isPublished =
      data.isPublished;
  }

  await content.save();

  return content;
}

export async function updateWebsiteContentStatus(
  section: WebsiteContentSection,
  isPublished: boolean,
) {
  const content =
    await getContentBySectionOrFail(
      section,
    );

  content.isPublished =
    isPublished;

  await content.save();

  return content;
}

export async function deleteWebsiteContent(
  section: WebsiteContentSection,
) {
  const content =
    await getContentBySectionOrFail(
      section,
    );

  await content.deleteOne();

  return {
    deleted: true,
    section,
  };
}