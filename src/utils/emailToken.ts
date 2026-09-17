import crypto from "node:crypto";

export function generateEmailToken() {
  const token = crypto
    .randomBytes(32)
    .toString("hex");

  const tokenHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  return {
    token,
    tokenHash,
  };
}

export function hashEmailToken(
  token: string,
) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}