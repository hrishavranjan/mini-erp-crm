import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      details: err.details,
    });
  }

  // eslint-disable-next-line no-console
  console.error("[Unhandled Error]", err);

  return res.status(500).json({
    success: false,
    message: "Internal server error. Please try again later.",
  });
}
