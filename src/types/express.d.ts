import type { UserRole } from "../models/User.ts";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: UserRole;
        clientId?: string;
      };
    }
  }
}

export {};