import type { Request, Response } from "express";

import newsletterService from "../services/newsletterService.js";

export async function subscribe(
  req: Request,
  res: Response,
) {
  try {
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";

    if (!email) {
      res.status(400).json({
        success: false,
        message: "Email address is required.",
      });
      return;
    }

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
      return;
    }

    const subscriber =
      await newsletterService.subscribe(email);

    res.status(201).json({
      success: true,
      message:
        "You have successfully subscribed to our newsletter.",
      data: subscriber,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "EMAIL_ALREADY_SUBSCRIBED"
    ) {
      res.status(409).json({
        success: false,
        message:
          "This email address is already subscribed to our newsletter.",
      });
      return;
    }

    throw error;
  }
}

export async function getSubscribers(
  _req: Request,
  res: Response,
) {
  try {
    const subscribers =
      await newsletterService.getSubscribers();

    res.status(200).json({
      success: true,
      data: subscribers,
    });
  } catch (error) {
    throw error;
  }
}