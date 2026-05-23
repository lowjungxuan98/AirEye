import { describe, expect, it, vi } from "vitest";
import { SendNotificationService } from "../../../../../src/api/v1/services/send-notification.service";

describe("SendNotificationService", () => {
  it("sends a sender notification through the notifier", async () => {
    const notifier = {
      broadcastCaptureRequest: vi.fn(async () => {}),
      broadcastExportRefresh: vi.fn(async () => {})
    };
    const service = new SendNotificationService(notifier);

    await service.sendNotification();

    expect(notifier.broadcastCaptureRequest).toHaveBeenCalledOnce();
  });
});
