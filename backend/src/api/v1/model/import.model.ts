import type { StepModel } from "../../../libs/workflow/tool-reasoning";

export type AirEyeUpload = {
  createdAt: number;
  updatedAt: number;
  extractedText?: string;
  finalText?: string;
  imageUrl?: string;
  bucket?: string;
  objectKey?: string;
  errorMessage?: string;
};

export type AirEyeUploadRow = AirEyeUpload & { id: string };

/** SSE `data:` payload emitted when a request is waiting behind active workflow work. */
export type ImportStreamQueuedBody = {
  status: "queued";
  data: { position: number };
};

/** SSE `data:` payload emitted when a workflow step is about to execute. */
export type ImportStreamRunningStepBody = {
  status: "running_step";
  data: { index: number; prompt: string; model: StepModel };
};

/** SSE `data:` payload emitted when a workflow step finishes. */
export type ImportStreamStepOutputBody = {
  data: { stepIndex: number; output: string };
};

export type ImportStreamErrorBody = {
  error: { code: string; message: string };
};

/** Payloads written as SSE `data:` lines for `POST /api/v1/import`. */
export type ImportStreamSseData =
  | ImportStreamQueuedBody
  | ImportStreamRunningStepBody
  | ImportStreamStepOutputBody
  | AirEyeUploadRow
  | ImportStreamErrorBody
  | object;

export type ImportRequest = {
  imageBuffer: Buffer;
  imageMimeType: string;
};
