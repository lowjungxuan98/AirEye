import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { createCaptureHandler } from "../../../../../src/api/v1/controllers/capture.controller";

describe("createCaptureHandler", () => {
  it("sends FCM and returns ok", async () => {
    const captureService = { sendCaptureNotification: vi.fn(async () => {}) };
    const handler = createCaptureHandler(captureService);
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as unknown as Response;

    await handler({} as Request, res);

    expect(captureService.sendCaptureNotification).toHaveBeenCalledOnce();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });
});
