import { describe, expect, it, vi } from "vitest";
import { ImportService } from "../../../../../src/api/v1/services/import.service";
import { InMemoryUploadRepository } from "../../../../in-memory-upload-repository";
import { ApiError } from "../../../../../src/libs/utils/api-error.util";
import type { WorkflowStep } from "../../../../../src/libs/workflow/type";

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

function makeAiFlagRepository(ai: boolean | null = null) {
  return {
    getAiEnabled: vi.fn(async () => ai),
    setAiEnabled: vi.fn(async () => {})
  };
}

type StepExecutorRun = (input: {
  provider: string;
  imageUrl: string;
  steps: WorkflowStep[];
  onStepStart?: (i: number, step: WorkflowStep) => void;
  onStepEnd?: (i: number, output: string) => void;
}) => Promise<string[]>;

function makeStepExecutor(impl: StepExecutorRun) {
  return { run: vi.fn(impl) };
}

describe("ImportService streamImport", () => {
  it("emits running_step + step output per tool-reasoning step then a success row", async () => {
    const uploadRepository = new InMemoryUploadRepository();
    const steps: WorkflowStep[] = [
      { prompt: "task-image", model: "image" },
      { prompt: "task-reasoning", model: "reasoning" },
      { prompt: "format-reasoning", model: "reasoning" }
    ];
    const providerState = { getCurrentProvider: vi.fn(async () => "test-provider") };
    const toolReasoning = { decideSteps: vi.fn(async () => steps) };
    const outputs = ["extracted", "drafted", "guarded"];
    const stepExecutor = makeStepExecutor(async ({ steps: s, onStepStart, onStepEnd }) => {
      s.forEach((step, i) => {
        onStepStart?.(i, step);
        onStepEnd?.(i, outputs[i]!);
      });
      return outputs;
    });
    const imageStorage = makeImageStorage();
    const notifier = makeNotifier();
    const emit = vi.fn();

    const service = new ImportService({
      uploadRepository,
      imageStorage,
      notifier,
      aiFlagRepository: makeAiFlagRepository(),
      providerState,
      toolReasoning,
      stepExecutor,
      logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
      now: () => 99,
      generateUploadId: () => "upl_testid"
    });

    await service.streamImport(
      { imageBuffer: Buffer.from("img"), imageMimeType: "image/png" },
      emit
    );

    expect(emit.mock.calls.map((c) => c[0])).toEqual([
      { status: "running_step", data: { index: 0, prompt: "task-image", model: "image" } },
      { data: { stepIndex: 0, output: "extracted" } },
      { status: "running_step", data: { index: 1, prompt: "task-reasoning", model: "reasoning" } },
      { data: { stepIndex: 1, output: "drafted" } },
      { status: "running_step", data: { index: 2, prompt: "format-reasoning", model: "reasoning" } },
      { data: { stepIndex: 2, output: "guarded" } },
      {
        id: "upl_testid",
        createdAt: 99,
        updatedAt: 99,
        extractedText: "extracted",
        finalText: "guarded",
        imageUrl: "https://img",
        bucket: "b",
        objectKey: "k"
      }
    ]);

    expect(imageStorage.uploadImage).toHaveBeenCalledBefore(toolReasoning.decideSteps);
    expect(notifier.broadcastExportRefresh).toHaveBeenCalledBefore(toolReasoning.decideSteps);
    expect(providerState.getCurrentProvider).toHaveBeenCalledOnce();
    expect(toolReasoning.decideSteps).toHaveBeenCalledWith("test-provider", "https://img");
    expect(stepExecutor.run).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "test-provider", imageUrl: "https://img", steps })
    );
    expect(notifier.broadcastExportRefresh).toHaveBeenCalledTimes(2);

    const done = await uploadRepository.getUpload("upl_testid");
    expect(done?.extractedText).toBe("extracted");
    expect(done?.finalText).toBe("guarded");
    expect(done?.imageUrl).toBe("https://img");
    expect((done as Record<string, unknown>).questionType).toBeUndefined();
  });

  it("collapses to extractedText = finalText when tool-reasoning returns a single step", async () => {
    const uploadRepository = new InMemoryUploadRepository();
    const emit = vi.fn();
    const service = new ImportService({
      uploadRepository,
      imageStorage: makeImageStorage(),
      notifier: makeNotifier(),
      aiFlagRepository: makeAiFlagRepository(),
      providerState: { getCurrentProvider: async () => "test-provider" },
      toolReasoning: {
        decideSteps: async () => [{ prompt: "only", model: "image" }]
      },
      stepExecutor: makeStepExecutor(async ({ steps, onStepStart, onStepEnd }) => {
        onStepStart?.(0, steps[0]!);
        onStepEnd?.(0, "the-only-output");
        return ["the-only-output"];
      }),
      logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
      now: () => 1,
      generateUploadId: () => "upl_one"
    });

    await service.streamImport(
      { imageBuffer: Buffer.from("x"), imageMimeType: "image/png" },
      emit
    );

    const final = emit.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(final.extractedText).toBe("the-only-output");
    expect(final.finalText).toBe("the-only-output");
  });

  it("uploads and emits an image-only terminal row when AI is disabled", async () => {
    const uploadRepository = new InMemoryUploadRepository();
    const providerState = { getCurrentProvider: vi.fn() };
    const toolReasoning = { decideSteps: vi.fn() };
    const stepExecutor = { run: vi.fn() };
    const imageStorage = makeImageStorage();
    const notifier = makeNotifier();
    const emit = vi.fn();

    const service = new ImportService({
      uploadRepository,
      imageStorage,
      notifier,
      aiFlagRepository: makeAiFlagRepository(false),
      providerState,
      toolReasoning,
      stepExecutor,
      logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
      now: () => 123,
      generateUploadId: () => "upl_ai_off"
    });

    await service.streamImport(
      { imageBuffer: Buffer.from("img"), imageMimeType: "image/png" },
      emit
    );

    expect(emit).toHaveBeenCalledOnce();
    expect(emit).toHaveBeenCalledWith({
      id: "upl_ai_off",
      createdAt: 123,
      updatedAt: 123,
      imageUrl: "https://img",
      bucket: "b",
      objectKey: "k"
    });
    expect(providerState.getCurrentProvider).not.toHaveBeenCalled();
    expect(toolReasoning.decideSteps).not.toHaveBeenCalled();
    expect(stepExecutor.run).not.toHaveBeenCalled();
    expect(notifier.broadcastExportRefresh).toHaveBeenCalledOnce();

    const row = await uploadRepository.getUpload("upl_ai_off");
    expect(row).toMatchObject({
      id: "upl_ai_off",
      createdAt: 123,
      updatedAt: 123,
      imageUrl: "https://img",
      bucket: "b",
      objectKey: "k"
    });
    expect(row?.extractedText).toBeUndefined();
    expect(row?.finalText).toBeUndefined();
  });

  it("fails before upload when the AI flag cannot be read", async () => {
    const imageStorage = makeImageStorage();
    const uploadRepository = new InMemoryUploadRepository();
    const service = new ImportService({
      uploadRepository,
      imageStorage,
      notifier: makeNotifier(),
      aiFlagRepository: {
        getAiEnabled: vi.fn(async () => {
          throw new Error("firebase unavailable");
        }),
        setAiEnabled: vi.fn()
      },
      providerState: { getCurrentProvider: vi.fn() },
      toolReasoning: { decideSteps: vi.fn() },
      stepExecutor: { run: vi.fn() },
      logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
      generateUploadId: () => "upl_flag_fail"
    });

    await expect(
      service.streamImport({ imageBuffer: Buffer.from("x"), imageMimeType: "image/png" }, vi.fn())
    ).rejects.toThrow("firebase unavailable");
    expect(imageStorage.uploadImage).not.toHaveBeenCalled();
    expect(await uploadRepository.getUpload("upl_flag_fail")).toBeNull();
  });

  it("persists failure and emits error when tool-reasoning throws", async () => {
    const uploadRepository = new InMemoryUploadRepository();
    const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };
    const emit = vi.fn();
    const notifier = makeNotifier();

    const service = new ImportService({
      uploadRepository,
      imageStorage: makeImageStorage(),
      notifier,
      aiFlagRepository: makeAiFlagRepository(),
      providerState: { getCurrentProvider: async () => "test-provider" },
      toolReasoning: {
        decideSteps: async () => {
          throw new Error("tool reasoning failed");
        }
      },
      stepExecutor: { run: vi.fn() },
      logger,
      now: () => 7,
      generateUploadId: () => "upl_fail"
    });

    await service.streamImport(
      { imageBuffer: Buffer.from("x"), imageMimeType: "image/jpeg" },
      emit
    );

    expect(emit.mock.calls.map((c) => c[0])).toEqual([
      { error: { code: "INTERNAL_ERROR", message: "tool reasoning failed" } }
    ]);
    const row = await uploadRepository.getUpload("upl_fail");
    expect(row?.errorMessage).toBe("tool reasoning failed");
    expect(row?.updatedAt).toBe(7);
    expect(notifier.broadcastExportRefresh).toHaveBeenCalledOnce();
    expect(logger.error).toHaveBeenCalled();
  });

  it("emits ApiError code when the pipeline throws ApiError", async () => {
    const uploadRepository = new InMemoryUploadRepository();
    const emit = vi.fn();
    const service = new ImportService({
      uploadRepository,
      imageStorage: makeImageStorage(),
      notifier: makeNotifier(),
      aiFlagRepository: makeAiFlagRepository(),
      providerState: { getCurrentProvider: async () => "test-provider" },
      toolReasoning: {
        decideSteps: async () => {
          throw new ApiError(503, "UPSTREAM", "nim down");
        }
      },
      stepExecutor: { run: vi.fn() },
      logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
      generateUploadId: () => "upl_api"
    });

    await service.streamImport(
      { imageBuffer: Buffer.from("x"), imageMimeType: "image/png" },
      emit
    );

    expect(emit).toHaveBeenLastCalledWith({
      error: { code: "UPSTREAM", message: "nim down" }
    });
  });

  it("stops without a database entry when image upload returns null", async () => {
    const uploadRepository = new InMemoryUploadRepository();
    const toolReasoning = { decideSteps: vi.fn() };
    const stepExecutor = { run: vi.fn() };
    const imageStorage = { uploadImage: vi.fn(async () => null) };
    const notifier = makeNotifier();
    const emit = vi.fn();

    const service = new ImportService({
      uploadRepository,
      imageStorage,
      notifier,
      aiFlagRepository: makeAiFlagRepository(),
      providerState: { getCurrentProvider: vi.fn() },
      toolReasoning,
      stepExecutor,
      logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
      generateUploadId: () => "upl_upload_failed"
    });

    await service.streamImport({ imageBuffer: Buffer.from("x"), imageMimeType: "image/jpeg" }, emit);

    expect(await uploadRepository.getUpload("upl_upload_failed")).toBeNull();
    expect(toolReasoning.decideSteps).not.toHaveBeenCalled();
    expect(stepExecutor.run).not.toHaveBeenCalled();
    expect(notifier.broadcastExportRefresh).not.toHaveBeenCalled();
    expect(emit).toHaveBeenCalledOnce();
    expect(emit).toHaveBeenCalledWith({
      error: { code: "INTERNAL_ERROR", message: "upload failed" }
    });
  });
});

describe("ImportService streamRegenerate", () => {
  it("reuses the existing imageUrl and emits per-step events", async () => {
    const uploadRepository = new InMemoryUploadRepository();
    const existingImageUrl = "https://storage.example.test/uploads/upl_existing-abc123.jpg";
    await uploadRepository.createPendingUpload("upl_existing", {
      createdAt: 10,
      updatedAt: 11,
      extractedText: "old extracted",
      finalText: "old final",
      imageUrl: existingImageUrl,
      bucket: "b",
      objectKey: "k"
    });
    const steps: WorkflowStep[] = [
      { prompt: "task-image", model: "image" },
      { prompt: "task-reasoning", model: "reasoning" }
    ];
    const providerState = { getCurrentProvider: vi.fn(async () => "test-provider") };
    const toolReasoning = { decideSteps: vi.fn(async () => steps) };
    const outputs = ["new extracted", "new final"];
    const stepExecutor = makeStepExecutor(async ({ steps: s, onStepStart, onStepEnd }) => {
      s.forEach((step, i) => {
        onStepStart?.(i, step);
        onStepEnd?.(i, outputs[i]!);
      });
      return outputs;
    });
    const imageStorage = {
      uploadImage: vi.fn(async () => ({ imageUrl: "new", bucket: "new", objectKey: "new" }))
    };
    const notifier = makeNotifier();
    const emit = vi.fn();
    let now = 100;

    const service = new ImportService({
      uploadRepository,
      imageStorage,
      notifier,
      aiFlagRepository: makeAiFlagRepository(),
      providerState,
      toolReasoning,
      stepExecutor,
      logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
      now: () => now++
    });

    await service.streamRegenerate(
      { imageUrl: existingImageUrl, text: "old final" },
      emit
    );

    expect(imageStorage.uploadImage).not.toHaveBeenCalled();
    expect(toolReasoning.decideSteps).toHaveBeenCalledWith("test-provider", existingImageUrl);
    expect(stepExecutor.run).toHaveBeenCalledWith(
      expect.objectContaining({ imageUrl: existingImageUrl, steps })
    );
    expect(emit.mock.calls.map((c) => c[0])).toEqual([
      { status: "running_step", data: { index: 0, prompt: "task-image", model: "image" } },
      { data: { stepIndex: 0, output: "new extracted" } },
      { status: "running_step", data: { index: 1, prompt: "task-reasoning", model: "reasoning" } },
      { data: { stepIndex: 1, output: "new final" } },
      {
        id: "upl_existing",
        createdAt: 10,
        updatedAt: 101,
        extractedText: "new extracted",
        finalText: "new final",
        imageUrl: existingImageUrl,
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
      finalText: "new final",
      imageUrl: existingImageUrl,
      errorMessage: ""
    });
    expect((row as Record<string, unknown>).questionType).toBeUndefined();
  });

  it("throws NOT_FOUND before streaming when regenerate upload is missing", async () => {
    const service = new ImportService({
      uploadRepository: new InMemoryUploadRepository(),
      imageStorage: { uploadImage: vi.fn() },
      notifier: makeNotifier(),
      aiFlagRepository: makeAiFlagRepository(),
      providerState: { getCurrentProvider: vi.fn() },
      toolReasoning: { decideSteps: vi.fn() },
      stepExecutor: { run: vi.fn() },
      logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() }
    });

    await expect(
      service.streamRegenerate(
        { imageUrl: "https://storage.example.test/uploads/upl_missing-abc.jpg", text: "" },
        vi.fn()
      )
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws INVALID_REQUEST when regenerate imageUrl has no upload object name", async () => {
    const service = new ImportService({
      uploadRepository: new InMemoryUploadRepository(),
      imageStorage: { uploadImage: vi.fn() },
      notifier: makeNotifier(),
      aiFlagRepository: makeAiFlagRepository(),
      providerState: { getCurrentProvider: vi.fn() },
      toolReasoning: { decideSteps: vi.fn() },
      stepExecutor: { run: vi.fn() },
      logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() }
    });

    await expect(
      service.streamRegenerate(
        { imageUrl: "https://storage.example.test/uploads/no-upload.jpg", text: "" },
        vi.fn()
      )
    ).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  });
});
