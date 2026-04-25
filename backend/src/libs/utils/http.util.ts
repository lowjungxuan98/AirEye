import type { RequestHandler } from "express";
import multer from "multer";
import { ApiError } from "./api-error.util";

export function wrapAsync(handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    void Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function mapRequestError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return new ApiError(413, "IMAGE_TOO_LARGE", "image exceeds the 500 MB limit");
    }
    return new ApiError(400, "INVALID_REQUEST", "Invalid multipart request");
  }
  return new ApiError(500, "INTERNAL_ERROR", "Internal server error");
}
