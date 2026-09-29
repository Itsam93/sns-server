export type AppErrorCode =
  | "AUTHENTICATION_REQUIRED"
  | "INVALID_CREDENTIALS"
  | "SESSION_EXPIRED"
  | "SESSION_INVALIDATED"
  | "FORBIDDEN"
  | "CSRF_TOKEN_INVALID"
  | "CSRF_INITIALIZATION_FAILED"
  | "VALIDATION_ERROR"
  | "INVALID_RESOURCE_IDENTIFIER"
  | "CONFLICT"
  | "TOO_MANY_REQUESTS"
  | "INTERNAL_SERVER_ERROR"
  | (string & {});

export class AppError extends Error {
  readonly statusCode: number;
  readonly code?: AppErrorCode;
  readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode = 500,
    code?: AppErrorCode,
  ) {
    super(message);

    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Object.setPrototypeOf(
      this,
      new.target.prototype,
    );
  }
}