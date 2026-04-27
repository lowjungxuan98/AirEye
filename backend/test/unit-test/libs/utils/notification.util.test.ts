import { describe, expect, it } from "vitest";
import { buildFcmTopicNotificationMessage } from "../../../../src/libs/utils/notification.util";

describe("buildFcmTopicNotificationMessage", () => {
  it("builds data-only silent messages for sender role", () => {
    const message = buildFcmTopicNotificationMessage("grim_new_result", {
      kind: "capture_request",
      type: "silent",
      role: "sender",
      data: { requestId: 123, ignored: null }
    });

    expect(message.notification).toBeUndefined();
    expect(message.android?.notification).toBeUndefined();
    expect(message.data).toMatchObject({
      kind: "capture_request",
      notificationType: "silent",
      notification_type: "silent",
      role: "sender",
      targetRole: "sender",
      requestId: "123"
    });
    expect(message.data).not.toHaveProperty("ignored");
    expect(message.apns?.payload?.aps).toEqual({ contentAvailable: true });
  });

  it("builds data-only silent messages for receiver export refresh", () => {
    const message = buildFcmTopicNotificationMessage("grim_new_result", {
      kind: "export_refresh",
      type: "silent",
      role: "receiver"
    });

    expect(message.notification).toBeUndefined();
    expect(message.data).toMatchObject({
      kind: "export_refresh",
      notificationType: "silent",
      notification_type: "silent",
      role: "receiver",
      targetRole: "receiver"
    });
    expect(message.data).not.toHaveProperty("url");
  });
});
