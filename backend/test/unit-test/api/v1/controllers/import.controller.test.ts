import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { createImportHandler } from "../../../../../src/api/v1/controllers/import.controller";
import { ApiError } from "../../../../../src/libs/utils/api-error.util";

const testImagePngPath = fileURLToPath(new URL("../../../test-image.png", import.meta.url));
const testImagePngBuffer = readFileSync(testImagePngPath);

describe("createImportHandler", () => {
  it("throws INVALID_REQUEST when image file is missing", async () => {
    const importService = { queueImport: vi.fn(), queueRegenerate: vi.fn() };
    const handler = createImportHandler(importService);
    const res = { status: vi.fn(), json: vi.fn() } as unknown as Response;

    await expect(handler({ file: undefined } as unknown as Request, res)).rejects.toMatchObject({
      code: "INVALID_REQUEST"
    });
    expect(importService.queueImport).not.toHaveBeenCalled();
  });

  it("returns 202 JSON with queued workflow data when file is present", async () => {
    const importService = {
      queueRegenerate: vi.fn(),
      queueImport: vi.fn(async () => ({
        status: "queued" as const,
        jobId: "job_1",
        uploadId: "upl_x"
      }))
    };
    const handler = createImportHandler(importService);
    const file = { buffer: testImagePngBuffer, mimetype: "image/png" };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as unknown as Response;

    await handler({ file } as unknown as Request, res);

    expect(importService.queueImport).toHaveBeenCalledWith({
      imageBuffer: testImagePngBuffer,
      imageMimeType: file.mimetype
    });
    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith({
      status: "queued",
      jobId: "job_1",
      uploadId: "upl_x"
    });
  });

  it("propagates ApiError from the service", async () => {
    const err = new ApiError(409, "CONFLICT", "nope");
    const importService = {
      queueImport: vi.fn(async () => Promise.reject(err)),
      queueRegenerate: vi.fn()
    };
    const handler = createImportHandler(importService);
    const file = { buffer: testImagePngBuffer, mimetype: "image/jpeg" };
    const res = { status: vi.fn(), json: vi.fn() } as unknown as Response;

    await expect(handler({ file } as unknown as Request, res)).rejects.toBe(err);
  });
});
