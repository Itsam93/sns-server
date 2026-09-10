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

    switch (target) {
      case "body":
        req.body = result.data;
        break;

      case "params":
        Object.assign(req.params, result.data);
        break;

      case "query":
        Object.assign(req.query, result.data);
        break;
    }

    next();
  };
}