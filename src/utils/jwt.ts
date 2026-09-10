import jwt, {
  type JwtPayload,
  type SignOptions,
} from "jsonwebtoken";

type UserRole = "client" | "admin";

export type AccessTokenPayload = {
  userId: string;
  role: UserRole;
};

const JWT_ALGORITHM = "HS256" as const;
const DEFAULT_JWT_ISSUER = "sns-api";
const DEFAULT_JWT_AUDIENCE = "sns-client";
const DEFAULT_ACCESS_TOKEN_EXPIRES_IN = "15m";

function getJwtSecret(): string {
  const secret =
    process.env.JWT_ACCESS_SECRET?.trim();

  if (!secret) {
    throw new Error(
      "JWT_ACCESS_SECRET is not defined",
    );
  }

  if (secret.length < 32) {
    throw new Error(
      "JWT_ACCESS_SECRET must contain at least 32 characters",
    );
  }

  return secret;
}

function getJwtIssuer(): string {
  return (
    process.env.JWT_ISSUER?.trim() ||
    DEFAULT_JWT_ISSUER
  );
}

function getJwtAudience(): string {
  return (
    process.env.JWT_AUDIENCE?.trim() ||
    DEFAULT_JWT_AUDIENCE
  );
}

function getAccessTokenExpiresIn():
  SignOptions["expiresIn"] {
  return (
    process.env.JWT_ACCESS_EXPIRES_IN?.trim() ||
    DEFAULT_ACCESS_TOKEN_EXPIRES_IN
  ) as SignOptions["expiresIn"];
}

function isAccessTokenPayload(
  payload: string | JwtPayload,
): payload is JwtPayload &
  AccessTokenPayload {
  return (
    typeof payload !== "string" &&
    typeof payload.userId === "string" &&
    payload.userId.length > 0 &&
    payload.userId.length <= 100 &&
    (payload.role === "client" ||
      payload.role === "admin")
  );
}

export function signAccessToken(
  payload: AccessTokenPayload,
): string {
  return jwt.sign(
    payload,
    getJwtSecret(),
    {
      algorithm: JWT_ALGORITHM,
      expiresIn:
        getAccessTokenExpiresIn(),
      issuer: getJwtIssuer(),
      audience: getJwtAudience(),
    },
  );
}

export function verifyAccessToken(
  token: string,
): AccessTokenPayload {
  if (
    typeof token !== "string" ||
    token.length === 0 ||
    token.length > 4096
  ) {
    throw new Error(
      "Invalid access token",
    );
  }

  const payload = jwt.verify(
    token,
    getJwtSecret(),
    {
      algorithms: [JWT_ALGORITHM],
      issuer: getJwtIssuer(),
      audience: getJwtAudience(),
    },
  );

  if (!isAccessTokenPayload(payload)) {
    throw new Error(
      "Invalid access token payload",
    );
  }

  return {
    userId: payload.userId,
    role: payload.role,
  };
}