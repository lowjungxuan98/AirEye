import { describe, expect, it, vi } from "vitest";
import { CaptureService } from "../../../../../src/api/v1/services/capture.service";

describe("CaptureService", () => {
  it("sends a capture notification through the notifier", async () => {
    const notifier = {
      broadcastNewResult: vi.fn(async () => {}),
      broadcastCaptureRequest: vi.fn(async () => {}),
      broadcastExportRefresh: vi.fn(async () => {})
    };
    const service = new CaptureService(notifier);

    await service.sendCaptureNotification();

    expect(notifier.broadcastCaptureRequest).toHaveBeenCalledOnce();
    expect(notifier.broadcastNewResult).not.toHaveBeenCalled();
  });
});
