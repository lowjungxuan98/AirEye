import type { RequestHandler } from "express";
import type { AiService } from "../model/services.model";
import { API_ERROR_MESSAGES, invalidRequest } from "../../../libs/utils/api-error.util";

export function createPutAiHandler(aiService: AiService): RequestHandler {
  return async (req, res) => {
    const body = req.body as Record<string, unknown> | null;
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      throw invalidRequest(API_ERROR_MESSAGES.expectedJsonObjectBody);
    }

    if (typeof body.ai !== "boolean") {
      throw invalidRequest("ai must be a boolean");
    }

    res.status(200).json(await aiService.setAiEnabled(body.ai));
  };
}
