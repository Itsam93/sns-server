import { z } from "zod";

const userRoleSchema =
  z.enum([
    "client",
    "admin",
  ]);

export const userIdSchema =
  z.object({
    id: z
      .string()
      .trim()
      .min(
        1,
        "User ID is required.",
      ),
  });

export const userRoleParamSchema =
  z.object({
    role:
      userRoleSchema,
  });

export const updateUserRoleSchema =
  z.object({
    role:
      userRoleSchema,
  });

export const updateUserStatusSchema =
  z.object({
    isActive:
      z.boolean(),
  });