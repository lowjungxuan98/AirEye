import { randomUUID } from "node:crypto";
import type {
  ImportService as ImportServiceContract,
  ImportServiceDependencies,
  ImportStreamEmitter,
  Logger
} from "../model/services.model";
import type { GrimUpload, ImportRequest } from "../model/import.model";
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
   * Order: image storage → SSE extracting_text → image text extraction → SSE analyzing_text → final text →
   * SSE format_guard → guarded final text → Realtime Database (single write) → FCM hint →
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
      emit({ status: "extracting_text" });
      const extractedText = await textExtractor.extractTextFromImage(
        request.imageBuffer,
        request.imageMimeType
      );
      emit({ data: { extractedText } });
      emit({ status: "analyzing_text" });
      const finalText = await finalTextBuilder.buildFinalText(extractedText);
      emit({ data: { finalText } });
      emit({ status: "format_guard" });
      const guardedFinalText = await finalTextFormatGuard.guardFinalText(finalText);
      emit({ data: { guardedFinalText } });
      const updatedAt = this.now();

      await uploadRepository.createPendingUpload(uploadId, {
        createdAt,
        updatedAt,
        extractedText,
        finalText: guardedFinalText,
        imageUrl: image.imageUrl,
        bucket: image.bucket,
        objectKey: image.objectKey
      });

      try {
        await notifier.broadcastNewResult();
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
