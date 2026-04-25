import { Router } from "express";
import { wrapAsync } from "../../../libs/utils/http.util";
import { createExportHandler } from "../controllers/export.controller";
import type { ExportService } from "../services/export.service";

export function createExportRouter(exportService: ExportService): Router {
  const router = Router();
  router.get("/export", wrapAsync(createExportHandler(exportService)));
  return router;
}
