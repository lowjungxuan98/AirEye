import { Router } from "express";
import type { AutoAnalyseService } from "../model/services.model";
import { wrapAsync } from "../../../libs/utils/http.util";
import { createPutAutoAnalyseHandler } from "../controllers/auto-analyse.controller";

export function createAutoAnalyseRouter(autoAnalyseService: AutoAnalyseService): Router {
  const router = Router();
  router.put("/auto-analyse", wrapAsync(createPutAutoAnalyseHandler(autoAnalyseService)));
  return router;
}
