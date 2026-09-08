import jwt, {
  type SignOptions,
} from "jsonwebtoken";

type AccessTokenPayload = {
  userId: string;
  role: "client" | "admin";
};

function getJwtSecret() {
  const secret =
    process.env.JWT_ACCESS_SECRET;

  if (!secret) {
    throw new Error(
      "JWT_ACCESS_SECRET is not defined",
    );
  }

  return secret;
}

export function signAccessToken(
  payload: AccessTokenPayload,
) {
  const options: SignOptions = {
    expiresIn:
      (process.env.JWT_ACCESS_EXPIRES_IN ||
        "15m") as SignOptions["expiresIn"],
  };

  return jwt.sign(
    payload,
    getJwtSecret(),
    options,
  );
}

export function verifyAccessToken(
  token: string,
) {
  return jwt.verify(
    token,
    getJwtSecret(),
  ) as AccessTokenPayload;
}