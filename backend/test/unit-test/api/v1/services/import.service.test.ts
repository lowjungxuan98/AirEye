import { describe, expect, it, vi } from "vitest";
import { ImportService } from "../../../../../src/api/v1/services/import.service";
import { InMemoryUploadRepository } from "../../../../in-memory-upload-repository";
import { ApiError } from "../../../../../src/libs/utils/api-error.util";

describe("ImportService", () => {
  it("emits status phases then success row after storage → extract → rewrite → RTDB → notifier", async () => {
    const uploadRepository = new InMemoryUploadRepository();
    const textExtractor = { extractTextFromImage: vi.fn(async () => "extracted") };
    const finalTextBuilder = { buildFinalText: vi.fn(async (t: string) => `final:${t}`) };
    const finalTextFormatGuard = { guardFinalText: vi.fn(async (t: string) => `guarded:${t}`) };
    const imageStorage = {
      uploadImage: vi.fn(async () => ({
        imageUrl: "https://img",
        bucket: "b",
        objectKey: "k"
      }))
    };
    const notifier = {
      broadcastNewResult: vi.fn(async () => {}),
      broadcastCaptureRequest: vi.fn(async () => {}),
      broadcastExportRefresh: vi.fn(async () => {})
    };
    const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };
    const emit = vi.fn();

    const service = new ImportService({
      uploadRepository,
      textExtractor,
      finalTextBuilder,
      finalTextFormatGuard,
      imageStorage,
      notifier,
      logger,
      now: () => 99,
      generateUploadId: () => "upl_testid"
    });

    await service.streamImport(
      { imageBuffer: Buffer.from("img"), imageMimeType: "image/png" },
      emit
    );

    expect(emit.mock.calls.map((c) => c[0])).toEqual([
      { status: "extracting_text" },
      { data: { extractedText: "extracted" } },
      { status: "analyzing_text" },
      { data: { finalText: "final:extracted" } },
      { status: "format_guard" },
      { data: { guardedFinalText: "guarded:final:extracted" } },
      {
        id: "upl_testid",
        createdAt: 99,
        updatedAt: 99,
        extractedText: "extracted",
        finalText: "guarded:final:extracted",
        imageUrl: "https://img",
        bucket: "b",
        objectKey: "k"
      }
    ]);

    expect(imageStorage.uploadImage).toHaveBeenCalledBefore(textExtractor.extractTextFromImage);
    expect(textExtractor.extractTextFromImage).toHaveBeenCalledWith(Buffer.from("img"), "image/png");
    expect(finalTextBuilder.buildFinalText).toHaveBeenCalledWith("extracted");
    expect(finalTextFormatGuard.guardFinalText).toHaveBeenCalledWith("final:extracted");
    expect(imageStorage.uploadImage).toHaveBeenCalledWith(Buffer.from("img"), "upl_testid", "image/png");
    expect(notifier.broadcastNewResult).toHaveBeenCalled();
    expect(notifier.broadcastExportRefresh).toHaveBeenCalled();

    const done = await uploadRepository.getUpload("upl_testid");
    expect(done?.createdAt).toBe(99);
    expect(done?.extractedText).toBe("extracted");
    expect(done?.finalText).toBe("guarded:final:extracted");
    expect(done?.imageUrl).toBe("https://img");
    expect(done?.bucket).toBe("b");
    expect(done?.objectKey).toBe("k");
    expect(done?.updatedAt).toBe(99);
  });

  it("persists failure and emits error when the pipeline throws", async () => {
    const uploadRepository = new InMemoryUploadRepository();
    const textExtractor = {
      extractTextFromImage: vi.fn(async () => {
        throw new Error("vision failed");
      })
    };
    const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };
    const emit = vi.fn();

    const service = new ImportService({
      uploadRepository,
      textExtractor,
      finalTextBuilder: { buildFinalText: vi.fn(async () => "") },
      finalTextFormatGuard: { guardFinalText: vi.fn(async (t: string) => t) },
      imageStorage: { uploadImage: vi.fn(async () => ({ imageUrl: "u", bucket: "b", objectKey: "k" })) },
      notifier: { broadcastNewResult: vi.fn(), broadcastCaptureRequest: vi.fn(), broadcastExportRefresh: vi.fn() },
      logger,
      now: () => 7,
      generateUploadId: () => "upl_fail"
    });

    await service.streamImport({ imageBuffer: Buffer.from("x"), imageMimeType: "image/jpeg" }, emit);

    expect(emit.mock.calls.map((c) => c[0])).toEqual([
      { status: "extracting_text" },
      { error: { code: "INTERNAL_ERROR", message: "vision failed" } }
    ]);

    const row = await uploadRepository.getUpload("upl_fail");
    expect(row?.errorMessage).toBe("vision failed");
    expect(row?.updatedAt).toBe(7);
    expect(logger.error).toHaveBeenCalled();
  });

  it("emits ApiError code when pipeline throws ApiError", async () => {
    const uploadRepository = new InMemoryUploadRepository();
    const emit = vi.fn();
    const service = new ImportService({
      uploadRepository,
      textExtractor: {
        extractTextFromImage: vi.fn(async () => {
          throw new ApiError(503, "UPSTREAM", "nim down");
        })
      },
      finalTextBuilder: { buildFinalText: vi.fn() },
      finalTextFormatGuard: { guardFinalText: vi.fn(async (t: string) => t) },
      imageStorage: { uploadImage: vi.fn(async () => ({ imageUrl: "u", bucket: "b", objectKey: "k" })) },
      notifier: { broadcastNewResult: vi.fn(), broadcastCaptureRequest: vi.fn(), broadcastExportRefresh: vi.fn() },
      logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
      generateUploadId: () => "upl_api"
    });

    await service.streamImport({ imageBuffer: Buffer.from("x"), imageMimeType: "image/png" }, emit);

    expect(emit).toHaveBeenLastCalledWith({
      error: { code: "UPSTREAM", message: "nim down" }
    });
  });
});
