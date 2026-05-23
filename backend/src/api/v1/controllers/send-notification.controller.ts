import type { Request, Response } from "express";
import type { SendNotificationResponse } from "../model/send-notification.model";
import type { SendNotificationService } from "../model/services.model";

export function createSendNotificationHandler(sendNotificationService: SendNotificationService) {
  return async (_req: Request, res: Response) => {
    await sendNotificationService.sendNotification();
    const body: SendNotificationResponse = { ok: true };
    res.status(200).json(body);
  };
}
