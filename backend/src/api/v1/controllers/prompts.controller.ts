import type { Request, RequestHandler } from "express";
import type { GrimPromptSettings, PromptUpdateBody } from "../../../libs/utils/prompt.util";
import { API_ERROR_MESSAGES, invalidRequest } from "../../../libs/utils/api-error.util";

type MulterFieldFiles = Record<string, Express.Multer.File[] | undefined>;

function firstFile(files: MulterFieldFiles | undefined, field: string): Express.Multer.File | undefined {
  return files?.[field]?.[0];
}

function readStringField(body: Request["body"], key: string): string | undefined {
  const v = body?.[key];
  if (typeof v === "string" && v.length > 0) {
    return v;
  }
  return undefined;
}

function readUtf8FromFile(file: Express.Multer.File | undefined): string | undefined {
  if (!file?.buffer?.length) {
    return undefined;
  }
  return file.buffer.toString("utf8");
}

export function createGetPromptsHandler(settings: GrimPromptSettings): RequestHandler {
  return async (_req, res) => {
    res.json(settings.getSnapshot());
  };
}

/**
 * Supports **`application/json`** (`analyzeQuestionPrompt` / `mcqExtractTextPrompt` /
 * `mcqFinalTextPrompt` / `taskExtractTextPrompt` / `taskFinalTextPrompt` /
 * `formatGuardPrompt`) or **`multipart/form-data`** with optional file parts
 * **`analyze_question`**, **`extract_text`**, **`analyzing_text`**,
 * **`task_extract_text`**, **`task_final_text`**, and **`format_guard`**
 * (and optional same-named text fields if no file for that slot).
 */
export function createPutPromptsHandler(settings: GrimPromptSettings): RequestHandler {
  return async (req, res) => {
    const ct = String(req.headers["content-type"] ?? "").toLowerCase();
    const isMultipart = ct.includes("multipart/form-data");

    let update: PromptUpdateBody;

    if (isMultipart) {
      const files = req.files as MulterFieldFiles | undefined;
      const readSlot = (field: string): string | undefined =>
        readUtf8FromFile(firstFile(files, field)) ?? readStringField(req.body, field);

      update = {
        analyzeQuestionPrompt: readSlot("analyze_question"),
        mcqExtractTextPrompt: readSlot("extract_text"),
        mcqFinalTextPrompt: readSlot("analyzing_text"),
        taskExtractTextPrompt: readSlot("task_extract_text"),
        taskFinalTextPrompt: readSlot("task_final_text"),
        formatGuardPrompt: readSlot("format_guard")
      };
    } else {
      const body = req.body as unknown;
      if (body === null || typeof body !== "object" || Array.isArray(body)) {
        throw invalidRequest(API_ERROR_MESSAGES.expectedJsonObjectBodyOrMultipart);
      }
      const json = body as PromptUpdateBody;
      update = {
        analyzeQuestionPrompt: json.analyzeQuestionPrompt,
        mcqExtractTextPrompt: json.mcqExtractTextPrompt,
        mcqFinalTextPrompt: json.mcqFinalTextPrompt,
        taskExtractTextPrompt: json.taskExtractTextPrompt,
        taskFinalTextPrompt: json.taskFinalTextPrompt,
        formatGuardPrompt: json.formatGuardPrompt
      };
    }

    settings.updatePrompts(update);
    res.status(200).json(settings.getSnapshot());
  };
}
