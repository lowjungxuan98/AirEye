import type { App } from "firebase-admin/app";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.hoisted(() => vi.fn(async () => "message-id"));
const getMessagingMock = vi.hoisted(() => vi.fn(() => ({ send: sendMock })));

vi.mock("firebase-admin/messaging", () => ({
  getMessaging: getMessagingMock
}));

import { FirebaseNotifier } from "../../../../src/libs/firebase/export";

describe("FirebaseNotifier", () => {
  beforeEach(() => {
    sendMock.mockClear();
    getMessagingMock.mockClear();
  });

  it("broadcasts sender capture requests through Firebase Messaging", async () => {
    const app = {} as App;
    const notifier = new FirebaseNotifier(app, "air-eye-topic");

    await expect(notifier.broadcastCaptureRequest()).resolves.toBeUndefined();

    expect(getMessagingMock).toHaveBeenCalledWith(app);
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: "air-eye-topic",
        data: expect.objectContaining({
          kind: "capture_request",
          role: "sender",
          targetRole: "sender"
        })
      })
    );
  });

  it("broadcasts receiver export refreshes through Firebase Messaging", async () => {
    const app = {} as App;
    const notifier = new FirebaseNotifier(app, "air-eye-topic");

    await expect(notifier.broadcastExportRefresh()).resolves.toBeUndefined();

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: "air-eye-topic",
        data: expect.objectContaining({
          kind: "export_refresh",
          role: "receiver",
          targetRole: "receiver"
        })
      })
    );
  });
});
