import crypto from "node:crypto";

export function generateWebhookSignature(
  payload: unknown,
  secret: string,
): string {
  const body = JSON.stringify(payload);

  return crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
}

export function verifyWebhookSignature(
  payload: unknown,
  signature: string,
  secret: string,
): boolean {
  if (!signature || !secret) {
    return false;
  }

  const expectedSignature =
    generateWebhookSignature(
      payload,
      secret,
    );

  const expectedBuffer =
    Buffer.from(expectedSignature, "utf8");

  const receivedBuffer =
    Buffer.from(signature.trim(), "utf8");

  if (
    expectedBuffer.length !==
    receivedBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    expectedBuffer,
    receivedBuffer,
  );
}