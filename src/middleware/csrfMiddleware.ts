import crypto from "node:crypto";
import type { RequestHandler } from "express";

const CSRF_COOKIE_NAME =
  process.env.CSRF_COOKIE_NAME?.trim() ||
  "csrfToken";

const CSRF_HEADER_NAME =
  process.env.CSRF_HEADER_NAME?.trim() ||
  "X-CSRF-Token";

const CSRF_TOKEN_BYTES = 32;
const CSRF_TOKEN_LENGTH =
  CSRF_TOKEN_BYTES * 2;

const CSRF_COOKIE_MAX_AGE =
  15 * 60 * 1000;

const SAFE_METHODS = new Set([
  "GET",
  "HEAD",
  "OPTIONS",
]);

function createCsrfToken(): string {
  return crypto
    .randomBytes(CSRF_TOKEN_BYTES)
    .toString("hex");
}

function isValidCsrfToken(
  token: unknown,
): token is string {
  return (
    typeof token === "string" &&
    token.length === CSRF_TOKEN_LENGTH &&
    /^[a-f0-9]+$/i.test(token)
  );
}

function setCsrfCookie(
  res: Parameters<RequestHandler>[1],
  token: string,
): void {
  res.cookie(
    CSRF_COOKIE_NAME,
    token,
    {
      httpOnly: false,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: CSRF_COOKIE_MAX_AGE,
    },
  );
}

export const csrfTokenMiddleware: RequestHandler = (
  req,
  res,
  next,
) => {
  try {
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );

    res.setHeader(
      "Pragma",
      "no-cache",
    );

    res.setHeader(
      "Expires",
      "0",
    );

    const existingToken =
      req.cookies?.[CSRF_COOKIE_NAME];

    if (isValidCsrfToken(existingToken)) {
      res.locals.csrfToken =
        existingToken;

      next();
      return;
    }

    const token = createCsrfToken();

    setCsrfCookie(res, token);

    res.locals.csrfToken = token;

    next();
  } catch {
    res.status(500).json({
      success: false,
      message:
        "Unable to initialize request security.",
    });
  }
};

export const requireCsrfToken: RequestHandler = (
  req,
  res,
  next,
) => {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const cookieToken =
    req.cookies?.[CSRF_COOKIE_NAME];

  const headerToken =
    req.get(CSRF_HEADER_NAME);

  if (
    !isValidCsrfToken(cookieToken) ||
    !isValidCsrfToken(headerToken)
  ) {
    res.status(403).json({
      success: false,
      message: "Invalid CSRF token.",
    });

    return;
  }

  const cookieBuffer =
    Buffer.from(cookieToken, "hex");

  const headerBuffer =
    Buffer.from(headerToken, "hex");

  if (
    !crypto.timingSafeEqual(
      cookieBuffer,
      headerBuffer,
    )
  ) {
    res.status(403).json({
      success: false,
      message: "Invalid CSRF token.",
    });

    return;
  }

  next();
};
