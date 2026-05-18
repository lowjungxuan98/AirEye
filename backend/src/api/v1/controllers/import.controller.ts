import type { Request, Response } from "express";
import { API_ERROR_MESSAGES, internalError, invalidRequest } from "../../../libs/utils/api-error.util";
import { writeSseData } from "../../../libs/utils/sse.util";
import type { ImportService } from "../model/services.model";

export function createImportHandler(importService: ImportService) {
  return async (req: Request, res: Response) => {
    if (!req.file) {
      throw invalidRequest(API_ERROR_MESSAGES.imageRequired);
    }
    try {
      await importService.streamImport(
        {
          imageBuffer: req.file.buffer,
          imageMimeType: req.file.mimetype
        },
        (data) => writeSseData(res, data)
      );
      if (!res.headersSent) {
        throw internalError(API_ERROR_MESSAGES.importNoStreamOutput);
      }
    } catch (error) {
      if (!res.headersSent) {
        throw error;
      }
    } finally {
      if (res.headersSent) {
        res.end();
      }
    }
  };
}
