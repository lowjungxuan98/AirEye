import { randomUUID } from "node:crypto";
import type {
  ImportService as ImportServiceContract,
  ImportServiceDependencies,
  ImportStreamEmitter,
  Logger
} from "../model/services.model";
import type { GrimUpload, GrimUploadRow, ImportRequest } from "../model/import.model";
import type { RegenerateRequest } from "../model/regenerate.model";
import { ApiError } from "../../../libs/utils/api-error.util";

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
   * Order: image storage → RTDB initial record + FCM export refresh → SSE extracting_text →
   * image text extraction → SSE analyzing_text → final text → SSE format_guard → guarded final text →
   * Realtime Database (update) → FCM export refresh →
   * SSE final row (or SSE error after RTDB error write).
   */
  async streamImport(request: ImportRequest, emit: ImportStreamEmitter): Promise<void> {
    const {
      uploadRepository,
      textExtractor,
      finalTextBuilder,
      finalTextFormatGuard,
      imageStorage,
      notifier
    } = this.deps;
    const uploadId = this.newId();
    const createdAt = this.now();

    try {
      const image = await imageStorage.uploadImage(
        request.imageBuffer,
        uploadId,
        request.imageMimeType
      );

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

      emit({ status: "extracting_text" });
      const extractedText = await textExtractor.extractTextFromImageUrl(image.imageUrl);
      emit({ data: { extractedText } });
      emit({ status: "analyzing_text" });
      const finalText = await finalTextBuilder.buildFinalText(extractedText);
      emit({ data: { finalText } });
      emit({ status: "format_guard" });
      const guardedFinalText = await finalTextFormatGuard.guardFinalText(finalText);
      emit({ data: { guardedFinalText } });
      const updatedAt = this.now();

      await uploadRepository.updateUpload(uploadId, {
        updatedAt,
        extractedText,
        finalText: guardedFinalText
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
        finalText: guardedFinalText,
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
    const {
      uploadRepository,
      textExtractor,
      finalTextBuilder,
      finalTextFormatGuard,
      notifier
    } = this.deps;
    const startedAt = this.now();
    const uploadId = extractUploadIdFromImageUrl(request.imageUrl);
    const existing = await uploadRepository.getUpload(uploadId);
    if (!existing) {
      throw new ApiError(404, "NOT_FOUND", "upload not found");
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

      emit({ status: "extracting_text" });
      const extractedText = await textExtractor.extractTextFromImageUrl(request.imageUrl);
      emit({ data: { extractedText } });
      emit({ status: "analyzing_text" });
      const finalText = await finalTextBuilder.buildFinalText(extractedText);
      emit({ data: { finalText } });
      emit({ status: "format_guard" });
      const guardedFinalText = await finalTextFormatGuard.guardFinalText(finalText);
      emit({ data: { guardedFinalText } });
      const updatedAt = this.now();

      await uploadRepository.updateUpload(uploadId, {
        updatedAt,
        extractedText,
        finalText: guardedFinalText,
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
        finalText: guardedFinalText,
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

  private toStreamError(error: unknown): { code: string; message: string } {
    if (error instanceof ApiError) {
      return { code: error.code, message: error.message };
    }
    if (error instanceof Error && error.message.trim()) {
      return { code: "INTERNAL_ERROR", message: error.message.trim().slice(0, 200) };
    }
    return { code: "INTERNAL_ERROR", message: "Internal server error" };
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
    throw new ApiError(400, "INVALID_REQUEST", "imageUrl must contain an upload object name");
  }
  return match[1]!;
}
