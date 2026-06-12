import { createRouter } from "../../../libs/utils/http.util";
import { createExportHandler } from "../controllers/export.controller";
import type { ExportService } from "../services/export.service";

export function createExportRouter(exportService: ExportService) {
  return createRouter([
    { method: "get", path: "/export", handlers: [createExportHandler(exportService)] }
  ]);
}
