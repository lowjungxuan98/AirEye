import { Router } from "express";
import { wrapAsync } from "../../../libs/utils/http.util";
import { createRegenerateHandler } from "../controllers/regenerate.controller";
import type { ImportService } from "../model/services.model";

export function createRegenerateRouter(importService: ImportService): Router {
  const router = Router();
  router.post("/regenerate", wrapAsync(createRegenerateHandler(importService)));
  return router;
}
