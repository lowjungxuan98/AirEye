import type { Request, Response } from "express";
import { parsePage } from "../../../libs/utils/pagination.util";
import { parseExportLimit, type ExportService } from "../services/export.service";

export type ExportHandlerService = Pick<ExportService, "listItemsPage">;

export function createExportHandler(exportService: ExportHandlerService) {
  return async (req: Request, res: Response) => {
    const page = parsePage(req.query.page);
    const limit = parseExportLimit(req.query.limit);
    const body = await exportService.listItemsPage(page, limit);
    res.status(200).json(body);
  };
}
