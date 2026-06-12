import { IMPORT_MAX_IMAGE_BYTES } from "../../../libs/constants/limits.contant";
import { createRouter } from "../../../libs/utils/http.util";
import { createImportImageMulter } from "../../../libs/utils/multer.util";
import { createImportHandler } from "../controllers/import.controller";
import type { ImportService } from "../model/services.model";

export function createImportRouter(importService: ImportService) {
  return createRouter([
    {
      method: "post",
      path: "/import",
      handlers: [
        createImportImageMulter(IMPORT_MAX_IMAGE_BYTES).single("image"),
        createImportHandler(importService)
      ]
    }
  ]);
}
