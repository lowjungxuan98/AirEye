import { Router } from "express";
import { wrapAsync } from "../../../libs/utils/http.util";
import { createCaptureHandler } from "../controllers/capture.controller";
import type { CaptureService } from "../model/services.model";

export function createCaptureRouter(captureService: CaptureService): Router {
  const router = Router();
  router.post("/capture", wrapAsync(createCaptureHandler(captureService)));
  return router;
}
