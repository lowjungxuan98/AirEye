import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { describe, expect, it, vi } from "vitest";
import { mapRequestError, wrapAsync } from "../../../../src/libs/utils/http.util";
import { ApiError } from "../../../../src/libs/utils/api-error.util";

describe("wrapAsync", () => {
  it("forwards rejected promises to next", async () => {
    const next = vi.fn<NextFunction>();
    const boom = new Error("boom");
    const handler = vi.fn(async () => {
      throw boom;
    });
    wrapAsync(handler as Parameters<typeof wrapAsync>[0])({} as Request, {} as Response, next);
    await vi.waitFor(() => expect(next).toHaveBeenCalledWith(boom));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does not call next when the handler resolves", async () => {
    const next = vi.fn<NextFunction>();
    const handler = vi.fn(async () => undefined);
    wrapAsync(handler as Parameters<typeof wrapAsync>[0])({} as Request, {} as Response, next);
    await Promise.resolve();
    expect(next).not.toHaveBeenCalled();
  });
});

describe("mapRequestError", () => {
  it("returns ApiError instances unchanged", () => {
    const err = new ApiError(418, "TEAPOT", "no");
    expect(mapRequestError(err)).toBe(err);
  });

  it("maps LIMIT_FILE_SIZE multer errors to 413", () => {
    const err = new multer.MulterError("LIMIT_FILE_SIZE");
    const mapped = mapRequestError(err);
    expect(mapped).toBeInstanceOf(ApiError);
    expect(mapped.statusCode).toBe(413);
    expect(mapped.code).toBe("IMAGE_TOO_LARGE");
  });

  it("maps other multer errors to 400", () => {
    const err = new multer.MulterError("LIMIT_UNEXPECTED_FILE");
    const mapped = mapRequestError(err);
    expect(mapped.statusCode).toBe(400);
    expect(mapped.code).toBe("INVALID_REQUEST");
  });

  it("maps unknown errors to internal error", () => {
    const mapped = mapRequestError(new Error("x"));
    expect(mapped.statusCode).toBe(500);
    expect(mapped.code).toBe("INTERNAL_ERROR");
  });
});
