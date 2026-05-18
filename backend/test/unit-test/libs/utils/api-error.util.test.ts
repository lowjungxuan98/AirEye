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
  mapPromptMulterError,
  promptFileTooLarge,
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
    expect(promptFileTooLarge()).toMatchObject({
      statusCode: 413,
      code: API_ERROR_CODES.promptFileTooLarge,
      message: API_ERROR_MESSAGES.promptFileTooLarge
    });
    expect(mapImageMulterError(new multer.MulterError("LIMIT_UNEXPECTED_FILE"))).toMatchObject({
      statusCode: 400,
      code: API_ERROR_CODES.invalidRequest,
      message: API_ERROR_MESSAGES.invalidMultipartRequest
    });
    expect(mapPromptMulterError(new multer.MulterError("LIMIT_FILE_SIZE"))).toMatchObject({
      statusCode: 413,
      code: API_ERROR_CODES.promptFileTooLarge,
      message: API_ERROR_MESSAGES.promptFileTooLarge
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
