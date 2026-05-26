import type { RequestHandler } from "express";
import type { AutoAnalyseService } from "../model/services.model";
import { API_ERROR_MESSAGES, invalidRequest } from "../../../libs/utils/api-error.util";

export function createPutAutoAnalyseHandler(autoAnalyseService: AutoAnalyseService): RequestHandler {
  return async (req, res) => {
    const body = req.body as Record<string, unknown> | null;
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      throw invalidRequest(API_ERROR_MESSAGES.expectedJsonObjectBody);
    }

    if (typeof body.auto_analyse !== "boolean") {
      throw invalidRequest("auto_analyse must be a boolean");
    }

    res
      .status(200)
      .json(await autoAnalyseService.setAutoAnalyseEnabled(body.auto_analyse));
  };
}
