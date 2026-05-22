import { randomUUID } from "node:crypto";
import type {
  ImportService as ImportServiceContract,
  ImportServiceDependencies,
  ImportStreamEmitter,
  Logger
} from "../model/services.model";
import type {
  ImportRequest,
  QuestionFlow,
  QuestionTypeCode
} from "../model/import.model";
import type { RegenerateRequest } from "../model/regenerate.model";
import {
  API_ERROR_MESSAGES,
  invalidRequest,
  toErrorPayload,
  uploadNotFound
} from "../../../libs/utils/api-error.util";

export class ImportService implements ImportServiceContract {
  private readonly logger: Logger;
  private readonly now: () => number;
  private readonly newId: () => string;

  constructor(private readonly deps: ImportServiceDependencies) {
    this.logger = deps.logger ?? console;
    this.now = deps.now ?? (() => Date.now());
    this.newId = deps.generateUploadId ?? (() => `upl_${randomUUID().replace(/-/g, "")}`);
  }

  /**
   * Order: image storage → RTDB initial record + FCM export refresh → SSE analyzing_question →
   * question-type classification → SSE extracting_text (branch-aware) → image text extraction →
   * SSE analyzing_text → final text → SSE format_guard → guarded final text →
   * Realtime Database (update) → FCM export refresh →
   * SSE final row (or SSE error after RTDB error write).
   */
  async streamImport(request: ImportRequest, emit: ImportStreamEmitter): Promise<void> {
    const { uploadRepository, imageStorage, notifier } = this.deps;
    const uploadId = this.newId();
    const createdAt = this.now();

    try {
      const image = await imageStorage.uploadImage(
        request.imageBuffer,
        uploadId,
        request.imageMimeType
      );
      if (!image) {
        emit({
          error: toErrorPayload(new Error(API_ERROR_MESSAGES.uploadFailed))
        });
        return;
      }

      await uploadRepository.createPendingUpload(uploadId, {
        createdAt,
        updatedAt: createdAt,
        imageUrl: image.imageUrl,
        bucket: image.bucket,
        objectKey: image.objectKey
      });

      try {
        await notifier.broadcastExportRefresh();
      } catch (error) {
        this.logger.error("failed to send initial FCM export refresh", error);
      }

      const { extractedText, finalText } = await this.runLlmPipeline(image.imageUrl, emit);
      const updatedAt = this.now();

      await uploadRepository.updateUpload(uploadId, {
        updatedAt,
        extractedText,
        finalText
      });

      try {
        await notifier.broadcastExportRefresh();
      } catch (error) {
        this.logger.error("failed to send FCM topic broadcast", error);
      }

      emit({
        id: uploadId,
        createdAt,
        updatedAt,
        extractedText,
        finalText,
        imageUrl: image.imageUrl,
        bucket: image.bucket,
        objectKey: image.objectKey
      });
    } catch (error) {
      try {
        await uploadRepository.createPendingUpload(uploadId, {
          createdAt,
          updatedAt: this.now(),
          errorMessage:
            error instanceof Error && error.message.trim()
              ? error.message.trim().slice(0, 200)
              : "Processing failed"
        });
      } catch (persistError) {
        this.logger.error("failed to persist pipeline error", persistError);
      }

      this.logger.error("import pipeline failed", error);
      const { code, message } = this.toStreamError(error);
      emit({ error: { code, message } });
    }
  }

  async streamRegenerate(request: RegenerateRequest, emit: ImportStreamEmitter): Promise<void> {
    const { uploadRepository, notifier } = this.deps;
    const startedAt = this.now();
    const uploadId = extractUploadIdFromImageUrl(request.imageUrl);
    const existing = await uploadRepository.getUpload(uploadId);
    if (!existing) {
      throw uploadNotFound();
    }

    try {
      await uploadRepository.updateUpload(uploadId, {
        updatedAt: startedAt,
        extractedText: "",
        finalText: "",
        errorMessage: ""
      });

      try {
        await notifier.broadcastExportRefresh();
      } catch (error) {
        this.logger.error("failed to send regenerate initial FCM export refresh", error);
      }

      const { extractedText, finalText } = await this.runLlmPipeline(request.imageUrl, emit);
      const updatedAt = this.now();

      await uploadRepository.updateUpload(uploadId, {
        updatedAt,
        extractedText,
        finalText,
        errorMessage: ""
      });

      try {
        await notifier.broadcastExportRefresh();
      } catch (error) {
        this.logger.error("failed to send regenerate FCM topic broadcast", error);
      }

      emit({
        id: uploadId,
        createdAt: existing.createdAt,
        updatedAt,
        extractedText,
        finalText,
        imageUrl: existing.imageUrl,
        bucket: existing.bucket,
        objectKey: existing.objectKey
      });
    } catch (error) {
      try {
        await uploadRepository.updateUpload(uploadId, {
          updatedAt: this.now(),
          errorMessage:
            error instanceof Error && error.message.trim()
              ? error.message.trim().slice(0, 200)
              : "Processing failed"
        });
      } catch (persistError) {
        this.logger.error("failed to persist regenerate pipeline error", persistError);
      }

      try {
        await notifier.broadcastExportRefresh();
      } catch (notifyError) {
        this.logger.error("failed to send regenerate failure FCM export refresh", notifyError);
      }

      this.logger.error("regenerate pipeline failed", error);
      const { code, message } = this.toStreamError(error);
      emit({ error: { code, message } });
    }
  }

  private async runLlmPipeline(
    imageUrl: string,
    emit: ImportStreamEmitter
  ): Promise<{ extractedText: string; finalText: string; questionType: QuestionTypeCode }> {
    const { questionTypeAnalyzer, textExtractor, finalTextBuilder, finalTextFormatGuard } = this.deps;

    emit({ status: "analyzing_question" });
    const questionType = await questionTypeAnalyzer.analyzeQuestionTypeFromImageUrl(imageUrl);
    emit({ data: { questionType } });

    const flow: QuestionFlow = questionType === "Task" ? "Task" : "MCQ";

    emit({ status: "extracting_text" });
    const extractedText = await textExtractor.extractTextFromImageUrl(imageUrl, flow);
    emit({ data: { extractedText } });

    emit({ status: "analyzing_text" });
    const finalText = await finalTextBuilder.buildFinalText(extractedText, flow);
    emit({ data: { finalText } });

    emit({ status: "format_guard" });
    const guardedFinalText = await finalTextFormatGuard.guardFinalText(finalText);
    emit({ data: { guardedFinalText } });

    return { extractedText, finalText: guardedFinalText, questionType };
  }

  private toStreamError(error: unknown): { code: string; message: string } {
    return toErrorPayload(error);
  }
}


function extractUploadIdFromImageUrl(imageUrl: string): string {
  let pathname = imageUrl;
  try {
    pathname = new URL(imageUrl).pathname;
  } catch {
    // Accept object-key-like strings in tests or internal callers.
  }

  const decodedPath = decodeURIComponent(pathname);
  const filename = decodedPath.split("/").pop() ?? "";
  const match = /^(upl_[A-Za-z0-9]+)(?:-|\.|$)/.exec(filename);
  if (!match) {
    throw invalidRequest(API_ERROR_MESSAGES.imageUrlMissingUploadObjectName);
  }
  return match[1]!;
}
