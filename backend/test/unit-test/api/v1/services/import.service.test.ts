import { describe, expect, it, vi } from "vitest";
import { ImportService } from "../../../../../src/api/v1/services/import.service";
import { InMemoryUploadRepository } from "../../../../in-memory-upload-repository";
import { ApiError } from "../../../../../src/libs/utils/api-error.util";
import type { QuestionTypeCode } from "../../../../../src/api/v1/model/import.model";

function makeImageStorage() {
  return {
    uploadImage: vi.fn(async () => ({
      imageUrl: "https://img",
      bucket: "b",
      objectKey: "k"
    }))
  };
}

function makeNotifier() {
  return {
    broadcastCaptureRequest: vi.fn(async () => {}),
    broadcastExportRefresh: vi.fn(async () => {})
  };
}

describe("ImportService streamImport", () => {
  it("emits status phases with analyzing_question first then success row, in pipeline order", async () => {
    const uploadRepository = new InMemoryUploadRepository();
    const questionTypeAnalyzer = {
      analyzeQuestionTypeFromImageUrl: vi.fn<[string], Promise<QuestionTypeCode>>(async () => "MCQ-Single")
    };
    const textExtractor = {
      extractTextFromImageUrl: vi.fn(async (_url: string, _flow: "MCQ" | "Task") => "extracted")
    };
    const finalTextBuilder = {
      buildFinalText: vi.fn(async (t: string, _flow: "MCQ" | "Task") => `final:${t}`)
    };
    const finalTextFormatGuard = { guardFinalText: vi.fn(async (t: string) => `guarded:${t}`) };
    const imageStorage = makeImageStorage();
    const notifier = makeNotifier();
    const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };
    const emit = vi.fn();

    const service = new ImportService({
      uploadRepository,
      questionTypeAnalyzer,
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
      { status: "analyzing_question" },
      { data: { questionType: "MCQ-Single" } },
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

    expect(imageStorage.uploadImage).toHaveBeenCalledBefore(
      questionTypeAnalyzer.analyzeQuestionTypeFromImageUrl
    );
    expect(notifier.broadcastExportRefresh).toHaveBeenCalledBefore(
      questionTypeAnalyzer.analyzeQuestionTypeFromImageUrl
    );
    expect(questionTypeAnalyzer.analyzeQuestionTypeFromImageUrl).toHaveBeenCalledWith("https://img");
    expect(textExtractor.extractTextFromImageUrl).toHaveBeenCalledWith("https://img", "MCQ");
    expect(finalTextBuilder.buildFinalText).toHaveBeenCalledWith("extracted", "MCQ");
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
    // questionType is intentionally not persisted
    expect((done as Record<string, unknown>).questionType).toBeUndefined();
  });

  it.each([
    ["MCQ-Single", "MCQ"],
    ["MCQ-Multiple", "MCQ"],
    ["Task", "Task"]
  ] as const)(
    "routes %s through the %s extract and final prompts",
    async (questionType, expectedFlow) => {
      const uploadRepository = new InMemoryUploadRepository();
      const questionTypeAnalyzer = {
        analyzeQuestionTypeFromImageUrl: vi.fn<[string], Promise<QuestionTypeCode>>(async () => questionType)
      };
      const textExtractor = {
        extractTextFromImageUrl: vi.fn(async (_url: string, _flow: "MCQ" | "Task") => "extracted")
      };
      const finalTextBuilder = {
        buildFinalText: vi.fn(async (t: string, _flow: "MCQ" | "Task") => `final:${t}`)
      };
      const finalTextFormatGuard = { guardFinalText: vi.fn(async (t: string) => t) };
      const emit = vi.fn();

      const service = new ImportService({
        uploadRepository,
        questionTypeAnalyzer,
        textExtractor,
        finalTextBuilder,
        finalTextFormatGuard,
        imageStorage: makeImageStorage(),
        notifier: makeNotifier(),
        logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
        now: () => 11,
        generateUploadId: () => "upl_routing"
      });

      await service.streamImport(
        { imageBuffer: Buffer.from("img"), imageMimeType: "image/png" },
        emit
      );

      expect(textExtractor.extractTextFromImageUrl).toHaveBeenCalledWith("https://img", expectedFlow);
      expect(finalTextBuilder.buildFinalText).toHaveBeenCalledWith("extracted", expectedFlow);
      const questionTypeEvent = emit.mock.calls
        .map((c) => c[0])
        .find((value): value is { data: { questionType: QuestionTypeCode } } =>
          typeof value === "object" && value !== null && "data" in value &&
          typeof (value as { data?: { questionType?: unknown } }).data?.questionType === "string"
        );
      expect(questionTypeEvent?.data.questionType).toBe(questionType);
    }
  );

  it("persists failure and emits error when the pipeline throws", async () => {
    const uploadRepository = new InMemoryUploadRepository();
    const questionTypeAnalyzer = {
      analyzeQuestionTypeFromImageUrl: vi.fn(async () => "MCQ-Single" as QuestionTypeCode)
    };
    const textExtractor = {
      extractTextFromImageUrl: vi.fn(async () => {
        throw new Error("vision failed");
      })
    };
    const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };
    const emit = vi.fn();
    const notifier = makeNotifier();

    const service = new ImportService({
      uploadRepository,
      questionTypeAnalyzer,
      textExtractor,
      finalTextBuilder: { buildFinalText: vi.fn(async () => "") },
      finalTextFormatGuard: { guardFinalText: vi.fn(async (t: string) => t) },
      imageStorage: makeImageStorage(),
      notifier,
      logger,
      now: () => 7,
      generateUploadId: () => "upl_fail"
    });

    await service.streamImport({ imageBuffer: Buffer.from("x"), imageMimeType: "image/jpeg" }, emit);

    expect(emit.mock.calls.map((c) => c[0])).toEqual([
      { status: "analyzing_question" },
      { data: { questionType: "MCQ-Single" } },
      { status: "extracting_text" },
      { error: { code: "INTERNAL_ERROR", message: "vision failed" } }
    ]);

    const row = await uploadRepository.getUpload("upl_fail");
    expect(row?.errorMessage).toBe("vision failed");
    expect(row?.updatedAt).toBe(7);
    expect(notifier.broadcastExportRefresh).toHaveBeenCalledOnce();
    expect(logger.error).toHaveBeenCalled();
  });

  it("propagates INVALID_PROVIDER when the classifier reply is unrecognized", async () => {
    const uploadRepository = new InMemoryUploadRepository();
    const questionTypeAnalyzer = {
      analyzeQuestionTypeFromImageUrl: vi.fn(async () => {
        throw new ApiError(400, "INVALID_PROVIDER", "Unrecognized question type from model: foo");
      })
    };
    const emit = vi.fn();

    const service = new ImportService({
      uploadRepository,
      questionTypeAnalyzer,
      textExtractor: { extractTextFromImageUrl: vi.fn() },
      finalTextBuilder: { buildFinalText: vi.fn() },
      finalTextFormatGuard: { guardFinalText: vi.fn() },
      imageStorage: makeImageStorage(),
      notifier: makeNotifier(),
      logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
      now: () => 1,
      generateUploadId: () => "upl_bad"
    });

    await service.streamImport({ imageBuffer: Buffer.from("x"), imageMimeType: "image/png" }, emit);

    expect(emit.mock.calls.map((c) => c[0])).toEqual([
      { status: "analyzing_question" },
      {
        error: { code: "INVALID_PROVIDER", message: "Unrecognized question type from model: foo" }
      }
    ]);
    const row = await uploadRepository.getUpload("upl_bad");
    expect(row?.errorMessage).toBe("Unrecognized question type from model: foo");
  });

  it("stops without a database entry when image upload returns null", async () => {
    const uploadRepository = new InMemoryUploadRepository();
    const questionTypeAnalyzer = { analyzeQuestionTypeFromImageUrl: vi.fn() };
    const textExtractor = { extractTextFromImageUrl: vi.fn() };
    const finalTextBuilder = { buildFinalText: vi.fn() };
    const finalTextFormatGuard = { guardFinalText: vi.fn() };
    const imageStorage = { uploadImage: vi.fn(async () => null) };
    const notifier = makeNotifier();
    const emit = vi.fn();

    const service = new ImportService({
      uploadRepository,
      questionTypeAnalyzer,
      textExtractor,
      finalTextBuilder,
      finalTextFormatGuard,
      imageStorage,
      notifier,
      logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
      generateUploadId: () => "upl_upload_failed"
    });

    await service.streamImport({ imageBuffer: Buffer.from("x"), imageMimeType: "image/jpeg" }, emit);

    expect(await uploadRepository.getUpload("upl_upload_failed")).toBeNull();
    expect(questionTypeAnalyzer.analyzeQuestionTypeFromImageUrl).not.toHaveBeenCalled();
    expect(textExtractor.extractTextFromImageUrl).not.toHaveBeenCalled();
    expect(finalTextBuilder.buildFinalText).not.toHaveBeenCalled();
    expect(finalTextFormatGuard.guardFinalText).not.toHaveBeenCalled();
    expect(notifier.broadcastExportRefresh).not.toHaveBeenCalled();
    expect(emit).toHaveBeenCalledOnce();
    expect(emit).toHaveBeenCalledWith({
      error: {
        code: "INTERNAL_ERROR",
        message: "upload failed"
      }
    });
  });

  it("emits ApiError code when pipeline throws ApiError", async () => {
    const uploadRepository = new InMemoryUploadRepository();
    const emit = vi.fn();
    const service = new ImportService({
      uploadRepository,
      questionTypeAnalyzer: {
        analyzeQuestionTypeFromImageUrl: vi.fn(async () => "MCQ-Single" as QuestionTypeCode)
      },
      textExtractor: {
        extractTextFromImageUrl: vi.fn(async () => {
          throw new ApiError(503, "UPSTREAM", "nim down");
        })
      },
      finalTextBuilder: { buildFinalText: vi.fn() },
      finalTextFormatGuard: { guardFinalText: vi.fn(async (t: string) => t) },
      imageStorage: makeImageStorage(),
      notifier: makeNotifier(),
      logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
      generateUploadId: () => "upl_api"
    });

    await service.streamImport({ imageBuffer: Buffer.from("x"), imageMimeType: "image/png" }, emit);

    expect(emit).toHaveBeenLastCalledWith({
      error: { code: "UPSTREAM", message: "nim down" }
    });
  });
});

describe("ImportService streamRegenerate", () => {
  it("emits analyzing_question first and reuses the existing imageUrl", async () => {
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
    const questionTypeAnalyzer = {
      analyzeQuestionTypeFromImageUrl: vi.fn(async () => "Task" as QuestionTypeCode)
    };
    const textExtractor = {
      extractTextFromImageUrl: vi.fn(async (_url: string, _flow: "MCQ" | "Task") => "new extracted")
    };
    const finalTextBuilder = {
      buildFinalText: vi.fn(async (t: string, _flow: "MCQ" | "Task") => `final:${t}`)
    };
    const finalTextFormatGuard = { guardFinalText: vi.fn(async (t: string) => `guarded:${t}`) };
    const imageStorage = {
      uploadImage: vi.fn(async () => ({ imageUrl: "new", bucket: "new", objectKey: "new" }))
    };
    const notifier = makeNotifier();
    const emit = vi.fn();
    let now = 100;

    const service = new ImportService({
      uploadRepository,
      questionTypeAnalyzer,
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
    expect(notifier.broadcastExportRefresh).toHaveBeenCalledBefore(
      questionTypeAnalyzer.analyzeQuestionTypeFromImageUrl
    );
    expect(questionTypeAnalyzer.analyzeQuestionTypeFromImageUrl).toHaveBeenCalledWith(
      "https://storage.example.test/uploads/upl_existing-abc123.jpg"
    );
    expect(textExtractor.extractTextFromImageUrl).toHaveBeenCalledWith(
      "https://storage.example.test/uploads/upl_existing-abc123.jpg",
      "Task"
    );
    expect(finalTextBuilder.buildFinalText).toHaveBeenCalledWith("new extracted", "Task");
    expect(finalTextFormatGuard.guardFinalText).toHaveBeenCalledWith("final:new extracted");
    expect(emit.mock.calls.map((c) => c[0])).toEqual([
      { status: "analyzing_question" },
      { data: { questionType: "Task" } },
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
    expect((row as Record<string, unknown>).questionType).toBeUndefined();
  });

  it("throws NOT_FOUND before streaming when regenerate upload is missing", async () => {
    const service = new ImportService({
      uploadRepository: new InMemoryUploadRepository(),
      questionTypeAnalyzer: { analyzeQuestionTypeFromImageUrl: vi.fn() },
      textExtractor: { extractTextFromImageUrl: vi.fn() },
      finalTextBuilder: { buildFinalText: vi.fn() },
      finalTextFormatGuard: { guardFinalText: vi.fn() },
      imageStorage: { uploadImage: vi.fn() },
      notifier: makeNotifier(),
      logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() }
    });

    await expect(
      service.streamRegenerate({ imageUrl: "https://storage.example.test/uploads/upl_missing-abc.jpg", text: "" }, vi.fn())
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws INVALID_REQUEST before streaming when regenerate imageUrl has no upload object name", async () => {
    const service = new ImportService({
      uploadRepository: new InMemoryUploadRepository(),
      questionTypeAnalyzer: { analyzeQuestionTypeFromImageUrl: vi.fn() },
      textExtractor: { extractTextFromImageUrl: vi.fn() },
      finalTextBuilder: { buildFinalText: vi.fn() },
      finalTextFormatGuard: { guardFinalText: vi.fn() },
      imageStorage: { uploadImage: vi.fn() },
      notifier: makeNotifier(),
      logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() }
    });

    await expect(
      service.streamRegenerate({ imageUrl: "https://storage.example.test/uploads/no-upload.jpg", text: "" }, vi.fn())
    ).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  });
});
