import type { Request, Response } from "express";
import { API_ERROR_MESSAGES, invalidRequest } from "../../../libs/utils/api-error.util";
import { readJsonObjectBody, readNonEmptyString } from "../../../libs/utils/request-body.util";
import type { RegenerateRequest } from "../model/regenerate.model";
import type { ImportService } from "../model/services.model";

export function createRegenerateHandler(importService: ImportService) {
  return async (req: Request, res: Response) => {
    const request = parseRegenerateRequest(req.body);
    const response = await importService.queueRegenerate(request);
    res.status(202).json(response);
  };
}

function parseRegenerateRequest(body: unknown): RegenerateRequest {
  const input = readJsonObjectBody(body);
  const imageUrl = readNonEmptyString(input, "imageUrl");

  if (typeof input.text !== "string") {
    throw invalidRequest(API_ERROR_MESSAGES.textMustBeString);
  }

  return { imageUrl, text: input.text };
}
