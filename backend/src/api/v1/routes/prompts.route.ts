import type { NextFunction, Request, Response } from "express";
import { Router, type RequestHandler } from "express";
import multer from "multer";
import { ApiError } from "../../../libs/utils/api-error.util";
import { mapRequestError, wrapAsync } from "../../../libs/utils/http.util";
import { createPromptFilesMulter } from "../../../libs/utils/multer.util";
import type { GrimPromptSettings } from "../../../libs/utils/prompt.util";
import {
  createGetPromptsHandler,
  createPutPromptsHandler
} from "../controllers/prompts.controller";

function mapPromptMulterError(err: unknown): ApiError {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return new ApiError(413, "PROMPT_FILE_TOO_LARGE", "Each prompt file must be at most 2 MB");
    }
    return new ApiError(400, "INVALID_REQUEST", err.message);
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
      next(new ApiError(401, "UNAUTHORIZED", "Invalid or missing X-Grim-Prompt-Secret header"));
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
