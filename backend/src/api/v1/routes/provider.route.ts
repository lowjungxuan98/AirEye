import type { ProviderService } from "../model/services.model";
import { createRouter } from "../../../libs/utils/http.util";
import {
  createGetProviderHandler,
  createPutProviderHandler
} from "../controllers/provider.controller";

export function createProviderRouter(providerService: ProviderService) {
  return createRouter([
    { method: "get", path: "/provider", handlers: [createGetProviderHandler(providerService)] },
    { method: "put", path: "/provider", handlers: [createPutProviderHandler(providerService)] }
  ]);
}
