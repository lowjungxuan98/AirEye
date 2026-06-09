import { randomUUID } from "node:crypto";
import type {
  ImportService as ImportServiceContract,
  ImportServiceDependencies,
  ImportWorkflowJob,
  ImportWorkflowQueue,
  Logger
} from "../model/services.model";
import type { ImportRequest, UploadedWorkflowImage } from "../model/import.model";
import type { RegenerateRequest } from "../model/regenerate.model";
import {
  API_ERROR_MESSAGES,
  internalError,
  invalidRequest,
  toErrorPayload,
  uploadNotFound
} from "../../../libs/utils/api-error.util";
import { normalizeImportImage } from "../../../libs/utils/import-image-normalizer.util";
import { InProcessImportWorkflowQueue } from "./import-workflow.queue";

export class ImportService implements ImportServiceContract {
  private readonly workflowQueue: ImportWorkflowQueue;
  private readonly logger: Logger;
  private readonly now: () => number;
  private readonly newId: () => string;

  constructor(private readonly deps: ImportServiceDependencies) {
    this.logger = deps.logger ?? console;
    this.now = deps.now ?? (() => Date.now());
    this.newId = deps.generateUploadId ?? (() => `upl_${randomUUID().replace(/-/g, "")}`);
    this.workflowQueue =
      deps.workflowQueueFactory?.((job) => this.processQueuedWorkflow(job)) ??
      new InProcessImportWorkflowQueue((job) => this.processQueuedWorkflow(job), this.logger);
  }

  async queueImport(request: ImportRequest) {
    const { uploadRepository, imageStorage } = this.deps;
    const uploadId = this.newId();
    const createdAt = this.now();
    const normalizedImage = await normalizeImportImage(
      request.imageBuffer,
      request.imageMimeType
    );

    const image = await imageStorage.uploadImage(
      normalizedImage.imageBuffer,
      uploadId,
      normalizedImage.imageMimeType
    );
    if (!image) {
      throw internalError(API_ERROR_MESSAGES.uploadFailed);
    }

    await uploadRepository.createPendingUpload(uploadId, {
      createdAt,
      updatedAt: createdAt,
      imageUrl: image.imageUrl,
      bucket: image.bucket,
      objectKey: image.objectKey
    });

    await this.broadcastExportRefresh("failed to send initial FCM export refresh");

    try {
      const { jobId } = await this.workflowQueue.enqueue({
        kind: "import",
        upload: {
          uploadId,
          imageUrl: image.imageUrl,
          bucket: image.bucket,
          objectKey: image.objectKey
        }
      });
      return { status: "queued" as const, jobId, uploadId };
    } catch (error) {
      await this.persistFailure(uploadId, error, "failed to persist import enqueue failure");
      await this.broadcastExportRefresh("failed to send import enqueue failure FCM export refresh");
      throw error;
    }
  }

  async queueRegenerate(request: RegenerateRequest) {
    const { uploadRepository } = this.deps;
    const uploadId = extractUploadIdFromImageUrl(request.imageUrl);
    const existing = await uploadRepository.getUpload(uploadId);
    if (!existing) {
      throw uploadNotFound();
    }

    const upload: UploadedWorkflowImage = {
      uploadId,
      imageUrl: existing.imageUrl?.trim() || request.imageUrl,
      bucket: existing.bucket,
      objectKey: existing.objectKey
    };

    try {
      const { jobId } = await this.workflowQueue.enqueue({
        kind: "regenerate",
        upload,
        request
      });
      return { status: "queued" as const, jobId, uploadId };
    } catch (error) {
      await this.persistFailure(uploadId, error, "failed to persist regenerate enqueue failure");
      await this.broadcastExportRefresh(
        "failed to send regenerate enqueue failure FCM export refresh"
      );
      throw error;
    }
  }

  private async processQueuedWorkflow(job: ImportWorkflowJob): Promise<void> {
    if (job.kind === "import") {
      await this.processQueuedImport(job.upload);
      return;
    }

    await this.processQueuedRegenerate(job.upload, job.request);
  }

  private async processQueuedImport(upload: UploadedWorkflowImage): Promise<void> {
    const { autoAnalyseFlagRepository } = this.deps;

    try {
      const autoAnalyseEnabled = (await autoAnalyseFlagRepository.getAutoAnalyseEnabled()) ?? true;
      if (!autoAnalyseEnabled) {
        return;
      }

      const { extractedText, finalText } = await this.runLlmPipeline(upload.imageUrl, "import");
      await this.deps.uploadRepository.updateUpload(upload.uploadId, {
        updatedAt: this.now(),
        extractedText,
        finalText,
        errorMessage: ""
      });

      await this.broadcastExportRefresh("failed to send FCM topic broadcast");
    } catch (error) {
      await this.persistWorkflowFailure(upload.uploadId, error, "failed to persist pipeline error");
      await this.broadcastExportRefresh("failed to send import failure FCM export refresh");
      this.logger.error("import pipeline failed", error);
    }
  }

  private async processQueuedRegenerate(
    upload: UploadedWorkflowImage,
    _request: RegenerateRequest
  ): Promise<void> {
    const { uploadRepository } = this.deps;

    try {
      const existing = await uploadRepository.getUpload(upload.uploadId);
      if (!existing) {
        throw uploadNotFound();
      }

      await uploadRepository.updateUpload(upload.uploadId, {
        updatedAt: this.now(),
        extractedText: "",
        finalText: "",
        errorMessage: ""
      });

      await this.broadcastExportRefresh("failed to send regenerate initial FCM export refresh");

      const { extractedText, finalText } = await this.runLlmPipeline(upload.imageUrl, "regenerate");
      await uploadRepository.updateUpload(upload.uploadId, {
        updatedAt: this.now(),
        extractedText,
        finalText,
        errorMessage: ""
      });

      await this.broadcastExportRefresh("failed to send regenerate FCM topic broadcast");
    } catch (error) {
      await this.persistWorkflowFailure(
        upload.uploadId,
        error,
        "failed to persist regenerate pipeline error"
      );
      await this.broadcastExportRefresh("failed to send regenerate failure FCM export refresh");
      this.logger.error("regenerate pipeline failed", error);
    }
  }

  private async runLlmPipeline(imageUrl: string, kind: "import" | "regenerate" = "import"): Promise<{
    extractedText: string;
    finalText: string;
  }> {
    const { providerState, workflowRunner } = this.deps;
    const provider = await providerState.getCurrentProvider();
    const { extractedText, finalText } = await workflowRunner.run({ provider, imageUrl, kind });
    return { extractedText, finalText };
  }

  private async persistFailure(uploadId: string, error: unknown, logMessage: string): Promise<void> {
    try {
      await this.deps.uploadRepository.updateUpload(uploadId, {
        updatedAt: this.now(),
        errorMessage: this.errorMessage(error)
      });
    } catch (persistError) {
      this.logger.error(logMessage, persistError);
    }
  }

  private async persistWorkflowFailure(
    uploadId: string,
    error: unknown,
    logMessage: string
  ): Promise<void> {
    try {
      await this.deps.uploadRepository.updateUpload(uploadId, {
        updatedAt: this.now(),
        finalText: this.errorMessage(error)
      });
    } catch (persistError) {
      this.logger.error(logMessage, persistError);
    }
  }

  private async broadcastExportRefresh(logMessage: string): Promise<void> {
    try {
      await this.deps.notifier.broadcastExportRefresh();
    } catch (error) {
      this.logger.error(logMessage, error);
    }
  }

  private errorMessage(error: unknown): string {
    const payload = toErrorPayload(error);
    return payload.message || "Processing failed";
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
