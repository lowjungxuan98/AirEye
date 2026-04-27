import { describe, expect, it } from "vitest";
import { loadServerEnv } from "../../../../src/libs/configs/env.config";
import { getFirebaseAdminApp } from "../../../../src/libs/firebase/admin";
import { DEFAULT_FCM_BROADCAST_TOPIC, FirebaseNotifier } from "../../../../src/libs/firebase/fcm";

describe("DEFAULT_FCM_BROADCAST_TOPIC", () => {
  it("matches the documented default topic", () => {
    expect(DEFAULT_FCM_BROADCAST_TOPIC).toBe("grim_new_result");
  });
});

describe("FirebaseNotifier", () => {
  it("broadcasts an export refresh topic data message using credentials from .env", async () => {
    const env = loadServerEnv();
    const app = getFirebaseAdminApp(env);
    const topic = env.GRIM_FCM_TOPIC ?? DEFAULT_FCM_BROADCAST_TOPIC;
    const notifier = new FirebaseNotifier(app, topic);
    await expect(notifier.broadcastExportRefresh()).resolves.toBeUndefined();
  });
});
