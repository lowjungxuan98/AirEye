import type { NextFunction, Request, Response } from "express";
import { Router, type RequestHandler } from "express";
import multer from "multer";
import {
  API_ERROR_MESSAGES,
  ApiError,
  mapPromptMulterError as toPromptMulterApiError,
  unauthorized
} from "../../../libs/utils/api-error.util";
import { mapRequestError, wrapAsync } from "../../../libs/utils/http.util";
import { createPromptFilesMulter } from "../../../libs/utils/multer.util";
import type { GrimPromptSettings } from "../../../libs/utils/prompt.util";
import {
  createGetPromptsHandler,
  createPutPromptsHandler
} from "../controllers/prompts.controller";

function mapPromptMulterError(err: unknown): ApiError {
  if (err instanceof multer.MulterError) {
    return toPromptMulterApiError(err);
  }
  return mapRequestError(err);
}

const promptMultipartUpload = createPromptFilesMulter().fields([
  { name: "extract_text", maxCount: 1 },
  { name: "analyzing_text", maxCount: 1 },
  { name: "format_guard", maxCount: 1 }
]);

function maybeParsePromptMultipart(req: Request, res: Response, next: NextFunction): void {
  const ct = String(req.headers["content-type"] ?? "").toLowerCase();
  if (!ct.includes("multipart/form-data")) {
    next();
    return;
  }
  promptMultipartUpload(req, res, (err: unknown) => {
    if (err) {
      next(mapPromptMulterError(err));
      return;
    }
    next();
  });
}

export function promptAdminGuard(adminSecret: string | undefined): RequestHandler {
  return (req, _res, next) => {
    if (!adminSecret) {
      next();
      return;
    }
    const provided = req.header("x-grim-prompt-secret");
    if (provided !== adminSecret) {
      next(unauthorized(API_ERROR_MESSAGES.invalidPromptSecret));
      return;
    }
    next();
  };
}

export function createPromptsRouter(
  settings: GrimPromptSettings,
  options?: { adminSecret?: string }
): Router {
  const router = Router();
  const guard = promptAdminGuard(options?.adminSecret);
  router.get("/prompts", guard, wrapAsync(createGetPromptsHandler(settings)));
  router.put(
    "/prompts",
    guard,
    maybeParsePromptMultipart,
    wrapAsync(createPutPromptsHandler(settings))
  );
  return router;
}
