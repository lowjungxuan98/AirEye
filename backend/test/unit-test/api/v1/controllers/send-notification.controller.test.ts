import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { createSendNotificationHandler } from "../../../../../src/api/v1/controllers/send-notification.controller";

describe("createSendNotificationHandler", () => {
  it("sends FCM and returns ok", async () => {
    const sendNotificationService = { sendNotification: vi.fn(async () => {}) };
    const handler = createSendNotificationHandler(sendNotificationService);
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as unknown as Response;

    await handler({} as Request, res);

    expect(sendNotificationService.sendNotification).toHaveBeenCalledOnce();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });
});
