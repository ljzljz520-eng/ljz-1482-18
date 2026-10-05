import type { NextFunction, Request, Response } from "express";
import { logger } from "./logger.js";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new ApiError(400, "BAD_REQUEST", message, details);
export const unauthorized = (message = "登录会话已过期，请重新登录") =>
  new ApiError(401, "UNAUTHORIZED", message);
export const forbidden = (message = "没有访问该资源的权限") =>
  new ApiError(403, "FORBIDDEN", message);
export const notFound = (message = "资源不存在或你无权访问") =>
  new ApiError(404, "NOT_FOUND", message);
export const retired = (message = "项目已退役，内容为只读") =>
  new ApiError(410, "PROJECT_RETIRED", message);
export const conflict = (message: string, details?: unknown) =>
  new ApiError(409, "CONFLICT", message, details);

export function asyncHandler<T extends (req: Request, res: Response, next: NextFunction) => Promise<unknown>>(
  fn: T
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function errorMiddleware(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details }
    });
  }
  logger.error("unhandled error: %s %s", req.method, req.originalUrl, err);
  return res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "服务内部错误，请稍后重试" }
  });
}
