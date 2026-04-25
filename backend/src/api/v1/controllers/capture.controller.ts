import type { Request, Response } from "express";
import type { CaptureResponse } from "../model/capture.model";
import type { CaptureService } from "../model/services.model";

export function createCaptureHandler(captureService: CaptureService) {
  return async (_req: Request, res: Response) => {
    await captureService.sendCaptureNotification();
    const body: CaptureResponse = { ok: true };
    res.status(200).json(body);
  };
}
