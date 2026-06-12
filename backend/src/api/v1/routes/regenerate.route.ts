import { createRouter } from "../../../libs/utils/http.util";
import { createRegenerateHandler } from "../controllers/regenerate.controller";
import type { ImportService } from "../model/services.model";

export function createRegenerateRouter(importService: ImportService) {
  return createRouter([
    { method: "post", path: "/regenerate", handlers: [createRegenerateHandler(importService)] }
  ]);
}
