import { Router } from "express";
import type { ProviderService } from "../model/services.model";
import { wrapAsync } from "../../../libs/utils/http.util";
import {
  createGetProviderHandler,
  createPutProviderHandler
} from "../controllers/provider.controller";

export function createProviderRouter(providerService: ProviderService): Router {
  const router = Router();
  router.get("/provider", wrapAsync(createGetProviderHandler(providerService)));
  router.put("/provider", wrapAsync(createPutProviderHandler(providerService)));
  return router;
}
