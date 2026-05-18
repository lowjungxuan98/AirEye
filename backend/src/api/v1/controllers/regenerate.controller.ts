import type { Request, Response } from "express";
import {
  API_ERROR_MESSAGES,
  fieldMustBeNonEmptyString,
  internalError,
  invalidRequest
} from "../../../libs/utils/api-error.util";
import { writeSseData } from "../../../libs/utils/sse.util";
import type { RegenerateRequest } from "../model/regenerate.model";
import type { ImportService } from "../model/services.model";

export function createRegenerateHandler(importService: ImportService) {
  return async (req: Request, res: Response) => {
    const request = parseRegenerateRequest(req.body);

    try {
      await importService.streamRegenerate(request, (data) => writeSseData(res, data));
      if (!res.headersSent) {
        throw internalError(API_ERROR_MESSAGES.regenerateNoStreamOutput);
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

function parseRegenerateRequest(body: unknown): RegenerateRequest {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw invalidRequest(API_ERROR_MESSAGES.expectedJsonObjectBody);
  }

  const input = body as Partial<Record<keyof RegenerateRequest, unknown>>;
  const imageUrl = readNonEmptyString(input.imageUrl, "imageUrl");

  if (typeof input.text !== "string") {
    throw invalidRequest(API_ERROR_MESSAGES.textMustBeString);
  }

  return { imageUrl, text: input.text };
}

function readNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw fieldMustBeNonEmptyString(field);
  }
  return value.trim();
}
