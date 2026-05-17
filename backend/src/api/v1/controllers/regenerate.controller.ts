import type { Request, Response } from "express";
import { ApiError } from "../../../libs/utils/api-error.util";
import { writeSseData } from "../../../libs/utils/sse.util";
import type { RegenerateRequest } from "../model/regenerate.model";
import type { ImportService } from "../model/services.model";

export function createRegenerateHandler(importService: ImportService) {
  return async (req: Request, res: Response) => {
    const request = parseRegenerateRequest(req.body);

    try {
      await importService.streamRegenerate(request, (data) => writeSseData(res, data));
      if (!res.headersSent) {
        throw new ApiError(500, "INTERNAL_ERROR", "Regenerate produced no stream output");
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
    throw new ApiError(400, "INVALID_REQUEST", "Expected a JSON object body");
  }

  const input = body as Partial<Record<keyof RegenerateRequest, unknown>>;
  const imageUrl = readNonEmptyString(input.imageUrl, "imageUrl");

  if (typeof input.text !== "string") {
    throw new ApiError(400, "INVALID_REQUEST", "text must be a string");
  }

  return { imageUrl, text: input.text };
}

function readNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApiError(400, "INVALID_REQUEST", `${field} must be a non-empty string`);
  }
  return value.trim();
}
