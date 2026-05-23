import { getMessaging } from "firebase-admin/messaging";
import type { App } from "firebase-admin/app";
import type { ResultNotifier } from "../../api/v1/model/services.model";
import { DEFAULT_FCM_BROADCAST_TOPIC } from "./constants";
import { buildFcmTopicNotificationMessage } from "./endpoint";

export class FirebaseNotifier implements ResultNotifier {
  constructor(
    private readonly firebaseApp: App,
    private readonly broadcastTopic: string = DEFAULT_FCM_BROADCAST_TOPIC
  ) {}

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
        role: "receiver"
      })
    );
  }
}
