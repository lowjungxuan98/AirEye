import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { createRegenerateHandler } from "../../../../../src/api/v1/controllers/regenerate.controller";
import { ApiError } from "../../../../../src/libs/utils/api-error.util";

describe("createRegenerateHandler", () => {
  it("returns 202 JSON with queued workflow data", async () => {
    const importService = {
      queueImport: vi.fn(),
      queueRegenerate: vi.fn(async () => ({
        status: "queued" as const,
        jobId: "job_1",
        uploadId: "upl_1"
      }))
    };
    const handler = createRegenerateHandler(importService);
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as unknown as Response;

    await handler(
      {
        body: {
          imageUrl: "https://storage.example.test/uploads/upl_1-abc.jpg",
          text: "old"
        }
      } as unknown as Request,
      res
    );

    expect(importService.queueRegenerate).toHaveBeenCalledWith({
      imageUrl: "https://storage.example.test/uploads/upl_1-abc.jpg",
      text: "old"
    });
    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith({
      status: "queued",
      jobId: "job_1",
      uploadId: "upl_1"
    });
  });

  it("throws INVALID_REQUEST when body is invalid", async () => {
    const importService = { queueImport: vi.fn(), queueRegenerate: vi.fn() };
    const handler = createRegenerateHandler(importService);
    const res = { status: vi.fn(), json: vi.fn() } as unknown as Response;

    await expect(
      handler({ body: { imageUrl: "" } } as unknown as Request, res)
    ).rejects.toMatchObject({
      code: "INVALID_REQUEST",
      message: "imageUrl must be a non-empty string"
    });
    expect(importService.queueRegenerate).not.toHaveBeenCalled();
  });

  it("propagates ApiError from the service", async () => {
    const err = new ApiError(404, "NOT_FOUND", "upload not found");
    const importService = {
      queueImport: vi.fn(),
      queueRegenerate: vi.fn(async () => Promise.reject(err))
    };
    const handler = createRegenerateHandler(importService);
    const res = { status: vi.fn(), json: vi.fn() } as unknown as Response;

    await expect(
      handler(
        {
          body: {
            imageUrl: "https://storage.example.test/uploads/upl_missing-abc.jpg",
            text: ""
          }
        } as unknown as Request,
        res
      )
    ).rejects.toBe(err);
  });
});
