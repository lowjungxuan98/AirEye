import type { RequestHandler } from "express";
import { ApiError, mapRequestError as toApiError } from "./api-error.util";

export function wrapAsync(handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    void Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function mapRequestError(error: unknown): ApiError {
  return toApiError(error);
}
