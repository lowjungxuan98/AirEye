import { Router } from "express";
import { IMPORT_MAX_IMAGE_BYTES } from "../../../libs/constants/limits.contant";
import { createImportImageMulter } from "../../../libs/utils/multer.util";
import { wrapAsync } from "../../../libs/utils/http.util";
import { createImportHandler } from "../controllers/import.controller";
import type { ImportService } from "../model/services.model";

export function createImportRouter(importService: ImportService): Router {
  const router = Router();
  router.post(
    "/import", 
    createImportImageMulter(IMPORT_MAX_IMAGE_BYTES).single("image"), 
    wrapAsync(createImportHandler(importService))
  );
  return router;
}
