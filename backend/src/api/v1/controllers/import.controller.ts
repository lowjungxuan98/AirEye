import type { Request, Response } from "express";
import { ApiError } from "../../../libs/utils/api-error.util";
import { writeSseData } from "../../../libs/utils/sse.util";
import type { ImportService } from "../model/services.model";

export function createImportHandler(importService: ImportService) {
  return async (req: Request, res: Response) => {
    if (!req.file) {
      throw new ApiError(400, "INVALID_REQUEST", "image is required");
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
        throw new ApiError(500, "INTERNAL_ERROR", "Import produced no stream output");
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
