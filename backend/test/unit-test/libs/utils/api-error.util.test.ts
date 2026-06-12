import { describe, expect, it } from "vitest";
import multer from "multer";
import {
  API_ERROR_CODES,
  API_ERROR_MESSAGES,
  ApiError,
  imageTooLarge,
  internalError,
  invalidRequest,
  mapImageMulterError,
  mapRequestError,
  toErrorPayload,
  uploadNotFound
} from "../../../../src/libs/utils/api-error.util";

describe("ApiError", () => {
  it("sets statusCode, code, message, and name", () => {
    const err = new ApiError(404, "NOT_FOUND", "missing");
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toBe("missing");
    expect(err.name).toBe("ApiError");
    expect(err).toBeInstanceOf(Error);
  });

  it("creates standardized request errors", () => {
    expect(invalidRequest("bad")).toMatchObject({
      statusCode: 400,
      code: API_ERROR_CODES.invalidRequest,
      message: "bad"
    });
    expect(internalError()).toMatchObject({
      statusCode: 500,
      code: API_ERROR_CODES.internalError,
      message: API_ERROR_MESSAGES.internalServerError
    });
    expect(uploadNotFound()).toMatchObject({
      statusCode: 404,
      code: API_ERROR_CODES.notFound,
      message: API_ERROR_MESSAGES.uploadNotFound
    });
  });

  it("maps multer errors through standardized upload contexts", () => {
    expect(imageTooLarge()).toMatchObject({
      statusCode: 413,
      code: API_ERROR_CODES.imageTooLarge,
      message: API_ERROR_MESSAGES.imageTooLarge
    });
    expect(mapImageMulterError(new multer.MulterError("LIMIT_UNEXPECTED_FILE"))).toMatchObject({
      statusCode: 400,
      code: API_ERROR_CODES.invalidRequest,
      message: API_ERROR_MESSAGES.invalidMultipartRequest
    });
    expect(mapImageMulterError(new multer.MulterError("LIMIT_FILE_SIZE"))).toMatchObject({
      statusCode: 413,
      code: API_ERROR_CODES.imageTooLarge,
      message: API_ERROR_MESSAGES.imageTooLarge
    });
  });

  it("normalizes stream error payloads", () => {
    expect(toErrorPayload(new ApiError(503, "UPSTREAM", "nim down"))).toEqual({
      code: "UPSTREAM",
      message: "nim down"
    });
    expect(toErrorPayload(new Error("vendor failed"))).toEqual({
      code: API_ERROR_CODES.internalError,
      message: "vendor failed"
    });
    expect(toErrorPayload(null)).toEqual({
      code: API_ERROR_CODES.internalError,
      message: API_ERROR_MESSAGES.internalServerError
    });
  });
});

describe("mapRequestError", () => {
  it("returns ApiError instances unchanged", () => {
    const err = new ApiError(418, "TEAPOT", "no");
    expect(mapRequestError(err)).toBe(err);
  });

  it("maps LIMIT_FILE_SIZE multer errors to 413", () => {
    const mapped = mapRequestError(new multer.MulterError("LIMIT_FILE_SIZE"));
    expect(mapped).toBeInstanceOf(ApiError);
    expect(mapped.statusCode).toBe(413);
    expect(mapped.code).toBe("IMAGE_TOO_LARGE");
  });

  it("maps other multer errors to 400", () => {
    const mapped = mapRequestError(new multer.MulterError("LIMIT_UNEXPECTED_FILE"));
    expect(mapped.statusCode).toBe(400);
    expect(mapped.code).toBe("INVALID_REQUEST");
  });

  it("maps unknown errors to internal error", () => {
    const mapped = mapRequestError(new Error("x"));
    expect(mapped.statusCode).toBe(500);
    expect(mapped.code).toBe("INTERNAL_ERROR");
  });
});
