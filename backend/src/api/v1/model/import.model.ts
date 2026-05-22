export type GrimUpload = {
  createdAt: number;
  updatedAt: number;
  extractedText?: string;
  finalText?: string;
  imageUrl?: string;
  bucket?: string;
  objectKey?: string;
  errorMessage?: string;
};

export type GrimUploadRow = GrimUpload & { id: string };

export type QuestionTypeCode = "Task" | "MCQ-Single" | "MCQ-Multiple";

export type QuestionFlow = "MCQ" | "Task";

/** SSE `data:` JSON for progress (after storage upload, between model calls). */
export type ImportStreamStatusBody = {
  status: "analyzing_question" | "extracting_text" | "analyzing_text" | "format_guard";
};

export type ImportStreamErrorBody = {
  error: { code: string; message: string };
};

/** Payloads written as SSE `data:` lines for `POST /api/v1/import`. */
export type ImportStreamSseData = ImportStreamStatusBody | GrimUploadRow | ImportStreamErrorBody | object;

export type ImportRequest = {
  imageBuffer: Buffer;
  imageMimeType: string;
};
