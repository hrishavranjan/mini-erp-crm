export type UserRole = "admin" | "sales" | "warehouse" | "accounts";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface JwtPayload {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

// Extend Express Request to carry the authenticated user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
