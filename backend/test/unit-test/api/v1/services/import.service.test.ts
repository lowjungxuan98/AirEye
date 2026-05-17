import { describe, expect, it, vi } from "vitest";
import { ImportService } from "../../../../../src/api/v1/services/import.service";
import { InMemoryUploadRepository } from "../../../../in-memory-upload-repository";
import { ApiError } from "../../../../../src/libs/utils/api-error.util";

describe("ImportService", () => {
  it("emits status phases then success row after storage → extract → rewrite → RTDB → notifier", async () => {
    const uploadRepository = new InMemoryUploadRepository();
    const textExtractor = {
      extractTextFromImage: vi.fn(async () => "unused"),
      extractTextFromImageUrl: vi.fn(async () => "extracted")
    };
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

    expect(imageStorage.uploadImage).toHaveBeenCalledBefore(textExtractor.extractTextFromImageUrl);
    expect(textExtractor.extractTextFromImage).not.toHaveBeenCalled();
    expect(textExtractor.extractTextFromImageUrl).toHaveBeenCalledWith("https://img");
    expect(finalTextBuilder.buildFinalText).toHaveBeenCalledWith("extracted");
    expect(finalTextFormatGuard.guardFinalText).toHaveBeenCalledWith("final:extracted");
    expect(imageStorage.uploadImage).toHaveBeenCalledWith(Buffer.from("img"), "upl_testid", "image/png");
    expect(notifier.broadcastExportRefresh).toHaveBeenCalledTimes(2);

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
      extractTextFromImageUrl: vi.fn(async () => {
        throw new Error("vision failed");
      }),
      extractTextFromImage: vi.fn(async () => "unused")
    };
    const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };
    const emit = vi.fn();
    const notifier = { broadcastCaptureRequest: vi.fn(), broadcastExportRefresh: vi.fn() };

    const service = new ImportService({
      uploadRepository,
      textExtractor,
      finalTextBuilder: { buildFinalText: vi.fn(async () => "") },
      finalTextFormatGuard: { guardFinalText: vi.fn(async (t: string) => t) },
      imageStorage: { uploadImage: vi.fn(async () => ({ imageUrl: "u", bucket: "b", objectKey: "k" })) },
      notifier,
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
    expect(notifier.broadcastExportRefresh).toHaveBeenCalledOnce();
    expect(logger.error).toHaveBeenCalled();
  });

  it("emits ApiError code when pipeline throws ApiError", async () => {
    const uploadRepository = new InMemoryUploadRepository();
    const emit = vi.fn();
    const service = new ImportService({
      uploadRepository,
      textExtractor: {
        extractTextFromImageUrl: vi.fn(async () => {
          throw new ApiError(503, "UPSTREAM", "nim down");
        }),
        extractTextFromImage: vi.fn(async () => "unused")
      },
      finalTextBuilder: { buildFinalText: vi.fn() },
      finalTextFormatGuard: { guardFinalText: vi.fn(async (t: string) => t) },
      imageStorage: { uploadImage: vi.fn(async () => ({ imageUrl: "u", bucket: "b", objectKey: "k" })) },
      notifier: { broadcastCaptureRequest: vi.fn(), broadcastExportRefresh: vi.fn() },
      logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
      generateUploadId: () => "upl_api"
    });

    await service.streamImport({ imageBuffer: Buffer.from("x"), imageMimeType: "image/png" }, emit);

    expect(emit).toHaveBeenLastCalledWith({
      error: { code: "UPSTREAM", message: "nim down" }
    });
  });

  it("regenerates an existing upload without uploading a new image", async () => {
    const uploadRepository = new InMemoryUploadRepository();
    await uploadRepository.createPendingUpload("upl_existing", {
      createdAt: 10,
      updatedAt: 11,
      extractedText: "old extracted",
      finalText: "old final",
      imageUrl: "https://storage.example.test/uploads/upl_existing-abc123.jpg",
      bucket: "b",
      objectKey: "k"
    });
    const textExtractor = {
      extractTextFromImage: vi.fn(async () => "unused"),
      extractTextFromImageUrl: vi.fn(async () => "new extracted")
    };
    const finalTextBuilder = { buildFinalText: vi.fn(async (t: string) => `final:${t}`) };
    const finalTextFormatGuard = { guardFinalText: vi.fn(async (t: string) => `guarded:${t}`) };
    const imageStorage = {
      uploadImage: vi.fn(async () => ({ imageUrl: "new", bucket: "new", objectKey: "new" }))
    };
    const notifier = {
      broadcastCaptureRequest: vi.fn(async () => {}),
      broadcastExportRefresh: vi.fn(async () => {})
    };
    const emit = vi.fn();
    let now = 100;

    const service = new ImportService({
      uploadRepository,
      textExtractor,
      finalTextBuilder,
      finalTextFormatGuard,
      imageStorage,
      notifier,
      logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
      now: () => now++
    });

    await service.streamRegenerate(
      { imageUrl: "https://storage.example.test/uploads/upl_existing-abc123.jpg", text: "old final" },
      emit
    );

    expect(imageStorage.uploadImage).not.toHaveBeenCalled();
    expect(textExtractor.extractTextFromImage).not.toHaveBeenCalled();
    expect(textExtractor.extractTextFromImageUrl).toHaveBeenCalledWith(
      "https://storage.example.test/uploads/upl_existing-abc123.jpg"
    );
    expect(finalTextBuilder.buildFinalText).toHaveBeenCalledWith("new extracted");
    expect(finalTextFormatGuard.guardFinalText).toHaveBeenCalledWith("final:new extracted");
    expect(emit.mock.calls.map((c) => c[0])).toEqual([
      { status: "extracting_text" },
      { data: { extractedText: "new extracted" } },
      { status: "analyzing_text" },
      { data: { finalText: "final:new extracted" } },
      { status: "format_guard" },
      { data: { guardedFinalText: "guarded:final:new extracted" } },
      {
        id: "upl_existing",
        createdAt: 10,
        updatedAt: 101,
        extractedText: "new extracted",
        finalText: "guarded:final:new extracted",
        imageUrl: "https://storage.example.test/uploads/upl_existing-abc123.jpg",
        bucket: "b",
        objectKey: "k"
      }
    ]);
    expect(notifier.broadcastExportRefresh).toHaveBeenCalledTimes(2);

    const row = await uploadRepository.getUpload("upl_existing");
    expect(row).toMatchObject({
      id: "upl_existing",
      createdAt: 10,
      updatedAt: 101,
      extractedText: "new extracted",
      finalText: "guarded:final:new extracted",
      imageUrl: "https://storage.example.test/uploads/upl_existing-abc123.jpg",
      bucket: "b",
      objectKey: "k",
      errorMessage: ""
    });
  });

  it("throws NOT_FOUND before streaming when regenerate upload is missing", async () => {
    const service = new ImportService({
      uploadRepository: new InMemoryUploadRepository(),
      textExtractor: {
        extractTextFromImage: vi.fn(),
        extractTextFromImageUrl: vi.fn()
      },
      finalTextBuilder: { buildFinalText: vi.fn() },
      finalTextFormatGuard: { guardFinalText: vi.fn() },
      imageStorage: { uploadImage: vi.fn() },
      notifier: { broadcastCaptureRequest: vi.fn(), broadcastExportRefresh: vi.fn() },
      logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() }
    });

    await expect(
      service.streamRegenerate({ imageUrl: "https://storage.example.test/uploads/upl_missing-abc.jpg", text: "" }, vi.fn())
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws INVALID_REQUEST before streaming when regenerate imageUrl has no upload object name", async () => {
    const service = new ImportService({
      uploadRepository: new InMemoryUploadRepository(),
      textExtractor: {
        extractTextFromImage: vi.fn(),
        extractTextFromImageUrl: vi.fn()
      },
      finalTextBuilder: { buildFinalText: vi.fn() },
      finalTextFormatGuard: { guardFinalText: vi.fn() },
      imageStorage: { uploadImage: vi.fn() },
      notifier: { broadcastCaptureRequest: vi.fn(), broadcastExportRefresh: vi.fn() },
      logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() }
    });

    await expect(
      service.streamRegenerate({ imageUrl: "https://storage.example.test/uploads/no-upload.jpg", text: "" }, vi.fn())
    ).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  });
});
