import { Router } from "express";
import { wrapAsync } from "../../../libs/utils/http.util";
import { createSendNotificationHandler } from "../controllers/send-notification.controller";
import type { SendNotificationService } from "../model/services.model";

export function createSendNotificationRouter(sendNotificationService: SendNotificationService): Router {
  const router = Router();
  router.post("/send-notification", wrapAsync(createSendNotificationHandler(sendNotificationService)));
  return router;
}
