import { createRouter } from "../../../libs/utils/http.util";
import { createSendNotificationHandler } from "../controllers/send-notification.controller";
import type { SendNotificationService } from "../model/services.model";

export function createSendNotificationRouter(sendNotificationService: SendNotificationService) {
  return createRouter([
    {
      method: "post",
      path: "/send-notification",
      handlers: [createSendNotificationHandler(sendNotificationService)]
    }
  ]);
}
