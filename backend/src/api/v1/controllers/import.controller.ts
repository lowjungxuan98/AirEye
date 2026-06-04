import type { Request, Response } from "express";
import { API_ERROR_MESSAGES, invalidRequest } from "../../../libs/utils/api-error.util";
import type { ImportService } from "../model/services.model";

export function createImportHandler(importService: ImportService) {
  return async (req: Request, res: Response) => {
    if (!req.file) {
      throw invalidRequest(API_ERROR_MESSAGES.imageRequired);
    }
    const response = await importService.queueImport({
      imageBuffer: req.file.buffer,
      imageMimeType: req.file.mimetype
    });
    res.status(202).json(response);
  };
}
