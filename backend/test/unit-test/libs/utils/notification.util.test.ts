import { describe, expect, it } from "vitest";
import { buildFcmTopicNotificationMessage } from "../../../../src/libs/utils/notification.util";

describe("buildFcmTopicNotificationMessage", () => {
  it("builds visible notify messages for receiver role", () => {
    const message = buildFcmTopicNotificationMessage("grim_new_result", {
      kind: "new_result",
      type: "notify",
      role: "receiver",
      title: "GRIM",
      body: "New result is ready."
    });

    expect(message.topic).toBe("grim_new_result");
    expect(message.notification).toEqual({ title: "GRIM", body: "New result is ready." });
    expect(message.data).toMatchObject({
      kind: "new_result",
      notificationType: "notify",
      notification_type: "notify",
      role: "receiver",
      targetRole: "receiver"
    });
    expect(message.android?.notification).toMatchObject({
      title: "GRIM",
      body: "New result is ready.",
      channelId: "grim_results"
    });
    expect(message.apns?.payload?.aps).toMatchObject({
      alert: { title: "GRIM", body: "New result is ready." },
      sound: "default"
    });
  });

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
      role: "receiver",
      data: { url: "/api/v1/export?page=1&limit=20" }
    });

    expect(message.notification).toBeUndefined();
    expect(message.data).toMatchObject({
      kind: "export_refresh",
      notificationType: "silent",
      role: "receiver",
      targetRole: "receiver",
      url: "/api/v1/export?page=1&limit=20"
    });
  });
});
