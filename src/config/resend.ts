import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY?.trim();

if (!apiKey) {
  throw new Error(
    "RESEND_API_KEY is not configured.",
  );
}

export const resend = new Resend(apiKey);

export const emailConfig = {
  fromEmail:
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "hello@stitchesnspices.org",

  fromName:
    process.env.RESEND_FROM_NAME?.trim() ||
    "Stitches-N-Spice",

  clientUrl:
    process.env.CLIENT_URL?.trim() ||
    "http://localhost:5173",
};