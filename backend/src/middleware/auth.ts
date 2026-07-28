import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/apiError";
import { JwtPayload, UserRole } from "../types";

const JWT_SECRET = process.env.JWT_SECRET as string;

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return next(new ApiError(401, "Authentication token missing. Please log in."));
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name,
    };
    next();
  } catch (err) {
    return next(new ApiError(401, "Invalid or expired token. Please log in again."));
  }
}

/**
 * Role-based access guard.
 * Usage: authorize("admin", "accounts")
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, "Not authenticated."));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ApiError(403, `Access denied. Requires role: ${allowedRoles.join(" or ")}.`)
      );
    }
    next();
  };
}
