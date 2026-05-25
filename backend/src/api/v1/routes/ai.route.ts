import { Router } from "express";
import type { AiService } from "../model/services.model";
import { wrapAsync } from "../../../libs/utils/http.util";
import { createPutAiHandler } from "../controllers/ai.controller";

export function createAiRouter(aiService: AiService): Router {
  const router = Router();
  router.put("/ai", wrapAsync(createPutAiHandler(aiService)));
  return router;
}
