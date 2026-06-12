import type { AutoAnalyseService } from "../model/services.model";
import { createRouter } from "../../../libs/utils/http.util";
import { createPutAutoAnalyseHandler } from "../controllers/auto-analyse.controller";

export function createAutoAnalyseRouter(autoAnalyseService: AutoAnalyseService) {
  return createRouter([
    {
      method: "put",
      path: "/auto-analyse",
      handlers: [createPutAutoAnalyseHandler(autoAnalyseService)]
    }
  ]);
}
