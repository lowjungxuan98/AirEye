import { getMessaging } from "firebase-admin/messaging";
import type { App } from "firebase-admin/app";
import type { ResultNotifier } from "../../api/v1/model/services.model";
import { buildFcmTopicNotificationMessage } from "../utils/notification.util";

/** Default FCM topic name; clients must subscribe with the same string (see Firebase topic messaging). */
export const DEFAULT_FCM_BROADCAST_TOPIC = "grim_new_result";

export class FirebaseNotifier implements ResultNotifier {
  constructor(
    private readonly firebaseApp: App,
    private readonly broadcastTopic: string = DEFAULT_FCM_BROADCAST_TOPIC
  ) {}

  async broadcastNewResult(): Promise<void> {
    await getMessaging(this.firebaseApp).send(
      buildFcmTopicNotificationMessage(this.broadcastTopic, {
        kind: "new_result",
        type: "notify",
        role: "receiver",
        title: "GRIM",
        body: "New result is ready."
      })
    );
  }

  async broadcastCaptureRequest(): Promise<void> {
    await getMessaging(this.firebaseApp).send(
      buildFcmTopicNotificationMessage(this.broadcastTopic, {
        kind: "capture_request",
        type: "silent",
        role: "sender"
      })
    );
  }

  async broadcastExportRefresh(): Promise<void> {
    await getMessaging(this.firebaseApp).send(
      buildFcmTopicNotificationMessage(this.broadcastTopic, {
        kind: "export_refresh",
        type: "silent",
        role: "receiver",
        data: {
          method: "GET",
          path: "/api/v1/export",
          page: 1,
          limit: 20,
          url: "/api/v1/export?page=1&limit=20"
        }
      })
    );
  }
}
