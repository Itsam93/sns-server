export class AppError extends Error {
  readonly statusCode: number;
  readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode = 500,
  ) {
    super(message);

    this.name = "AppError";
    this.statusCode = statusCode;
    this.isOperational = true;

    Object.setPrototypeOf(
      this,
      new.target.prototype,
    );
  }
}