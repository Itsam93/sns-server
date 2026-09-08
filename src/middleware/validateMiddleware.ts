import type { RequestHandler } from "express";
import type { ZodType } from "zod";

type ValidationTarget =
  | "body"
  | "params"
  | "query";

export function validate(
  schema: ZodType,
  target: ValidationTarget = "body",
): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(
      req[target],
    );

    if (!result.success) {
      next(result.error);
      return;
    }

    if (target === "body") {
      req.body = result.data;
    }

    if (target === "params") {
      Object.assign(req.params, result.data);
    }

    if (target === "query") {
      Object.assign(req.query, result.data);
    }

    next();
  };
}