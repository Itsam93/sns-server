import type { UserRole } from "../models/User.js";

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