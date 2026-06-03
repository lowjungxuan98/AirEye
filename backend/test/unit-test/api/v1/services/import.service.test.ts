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

function makeAutoAnalyseFlagRepository(autoAnalyse: boolean | null = null) {
  return {
    getAutoAnalyseEnabled: vi.fn(async () => autoAnalyse),
    setAutoAnalyseEnabled: vi.fn(async () => {})
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

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function waitFor(predicate: () => boolean): Promise<void> {
  for (let i = 0; i < 100; i += 1) {
    if (predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  throw new Error("Timed out waiting for condition");
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
      autoAnalyseFlagRepository: makeAutoAnalyseFlagRepository(),
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
      autoAnalyseFlagRepository: makeAutoAnalyseFlagRepository(),
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

  it("uploads and emits an image-only terminal row when auto_analyse is disabled", async () => {
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
      autoAnalyseFlagRepository: makeAutoAnalyseFlagRepository(false),
      providerState,
      toolReasoning,
      stepExecutor,
      logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
      now: () => 123,
      generateUploadId: () => "upl_auto_analyse_off"
    });

    await service.streamImport(
      { imageBuffer: Buffer.from("img"), imageMimeType: "image/png" },
      emit
    );

    expect(emit).toHaveBeenCalledOnce();
    expect(emit).toHaveBeenCalledWith({
      id: "upl_auto_analyse_off",
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

    const row = await uploadRepository.getUpload("upl_auto_analyse_off");
    expect(row).toMatchObject({
      id: "upl_auto_analyse_off",
      createdAt: 123,
      updatedAt: 123,
      imageUrl: "https://img",
      bucket: "b",
      objectKey: "k"
    });
    expect(row?.extractedText).toBeUndefined();
    expect(row?.finalText).toBeUndefined();
  });

  it("fails before upload when the auto_analyse flag cannot be read", async () => {
    const imageStorage = makeImageStorage();
    const uploadRepository = new InMemoryUploadRepository();
    const service = new ImportService({
      uploadRepository,
      imageStorage,
      notifier: makeNotifier(),
      autoAnalyseFlagRepository: {
        getAutoAnalyseEnabled: vi.fn(async () => {
          throw new Error("firebase unavailable");
        }),
        setAutoAnalyseEnabled: vi.fn()
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
      autoAnalyseFlagRepository: makeAutoAnalyseFlagRepository(),
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
      autoAnalyseFlagRepository: makeAutoAnalyseFlagRepository(),
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
      autoAnalyseFlagRepository: makeAutoAnalyseFlagRepository(),
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

  it("serializes parallel imports FIFO and emits queued for the second request", async () => {
    const uploadRepository = new InMemoryUploadRepository();
    const firstCanFinish = deferred();
    const runOrder: string[] = [];
    const steps: WorkflowStep[] = [{ prompt: "only", model: "image" }];
    const stepExecutor = makeStepExecutor(async ({ imageUrl, steps: s, onStepStart, onStepEnd }) => {
      const label = imageUrl.endsWith("upl_first") ? "first" : "second";
      runOrder.push(`${label}:start`);
      onStepStart?.(0, s[0]!);
      if (label === "first") {
        await firstCanFinish.promise;
      }
      onStepEnd?.(0, `${label}-output`);
      runOrder.push(`${label}:end`);
      return [`${label}-output`];
    });
    const ids = ["upl_first", "upl_second"];
    const service = new ImportService({
      uploadRepository,
      imageStorage: {
        uploadImage: vi.fn(async (_buffer, publicId) => ({
          imageUrl: `https://storage.example.test/uploads/${publicId}`,
          bucket: "b",
          objectKey: `uploads/${publicId}.jpg`
        }))
      },
      notifier: makeNotifier(),
      autoAnalyseFlagRepository: makeAutoAnalyseFlagRepository(),
      providerState: { getCurrentProvider: vi.fn(async () => "test-provider") },
      toolReasoning: { decideSteps: vi.fn(async () => steps) },
      stepExecutor,
      logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
      now: () => 1,
      generateUploadId: () => ids.shift()!
    });
    const firstEmit = vi.fn();
    const secondEmit = vi.fn();

    const first = service.streamImport(
      { imageBuffer: Buffer.from("first"), imageMimeType: "image/jpeg" },
      firstEmit
    );
    await waitFor(() => runOrder.includes("first:start"));

    const second = service.streamImport(
      { imageBuffer: Buffer.from("second"), imageMimeType: "image/jpeg" },
      secondEmit
    );
    expect(secondEmit.mock.calls.map((c) => c[0])).toEqual([
      { status: "queued", data: { position: 1 } }
    ]);

    firstCanFinish.resolve();
    await Promise.all([first, second]);

    expect(runOrder).toEqual(["first:start", "first:end", "second:start", "second:end"]);
    expect(secondEmit.mock.calls.map((c) => c[0])).toEqual([
      { status: "queued", data: { position: 1 } },
      { status: "running_step", data: { index: 0, prompt: "only", model: "image" } },
      { data: { stepIndex: 0, output: "second-output" } },
      {
        id: "upl_second",
        createdAt: 1,
        updatedAt: 1,
        extractedText: "second-output",
        finalText: "second-output",
        imageUrl: "https://storage.example.test/uploads/upl_second",
        bucket: "b",
        objectKey: "uploads/upl_second.jpg"
      }
    ]);
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
    const autoAnalyseFlagRepository = makeAutoAnalyseFlagRepository(false);
    let now = 100;

    const service = new ImportService({
      uploadRepository,
      imageStorage,
      notifier,
      autoAnalyseFlagRepository,
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
    expect(autoAnalyseFlagRepository.getAutoAnalyseEnabled).not.toHaveBeenCalled();
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
      autoAnalyseFlagRepository: makeAutoAnalyseFlagRepository(),
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
      autoAnalyseFlagRepository: makeAutoAnalyseFlagRepository(),
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

describe("ImportService import/regenerate queue", () => {
  it("uses one FIFO queue for import and regenerate workflows", async () => {
    const uploadRepository = new InMemoryUploadRepository();
    const existingImageUrl = "https://storage.example.test/uploads/upl_existing-abc.jpg";
    await uploadRepository.createPendingUpload("upl_existing", {
      createdAt: 1,
      updatedAt: 1,
      imageUrl: existingImageUrl,
      bucket: "b",
      objectKey: "uploads/upl_existing-abc.jpg"
    });
    const importCanFinish = deferred();
    const runOrder: string[] = [];
    const steps: WorkflowStep[] = [{ prompt: "only", model: "image" }];
    const stepExecutor = makeStepExecutor(async ({ imageUrl, steps: s, onStepStart, onStepEnd }) => {
      const label = imageUrl.includes("upl_import") ? "import" : "regenerate";
      runOrder.push(`${label}:start`);
      onStepStart?.(0, s[0]!);
      if (label === "import") {
        await importCanFinish.promise;
      }
      onStepEnd?.(0, `${label}-output`);
      runOrder.push(`${label}:end`);
      return [`${label}-output`];
    });
    const service = new ImportService({
      uploadRepository,
      imageStorage: {
        uploadImage: vi.fn(async (_buffer, publicId) => ({
          imageUrl: `https://storage.example.test/uploads/${publicId}`,
          bucket: "b",
          objectKey: `uploads/${publicId}.jpg`
        }))
      },
      notifier: makeNotifier(),
      autoAnalyseFlagRepository: makeAutoAnalyseFlagRepository(),
      providerState: { getCurrentProvider: vi.fn(async () => "test-provider") },
      toolReasoning: { decideSteps: vi.fn(async () => steps) },
      stepExecutor,
      logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
      now: () => 2,
      generateUploadId: () => "upl_import"
    });
    const importEmit = vi.fn();
    const regenerateEmit = vi.fn();

    const importPromise = service.streamImport(
      { imageBuffer: Buffer.from("img"), imageMimeType: "image/jpeg" },
      importEmit
    );
    await waitFor(() => runOrder.includes("import:start"));

    const regeneratePromise = service.streamRegenerate(
      { imageUrl: existingImageUrl, text: "old" },
      regenerateEmit
    );
    expect(regenerateEmit.mock.calls.map((c) => c[0])).toEqual([
      { status: "queued", data: { position: 1 } }
    ]);

    importCanFinish.resolve();
    await Promise.all([importPromise, regeneratePromise]);

    expect(runOrder).toEqual(["import:start", "import:end", "regenerate:start", "regenerate:end"]);
    expect(regenerateEmit.mock.calls[1]?.[0]).toEqual({
      status: "running_step",
      data: { index: 0, prompt: "only", model: "image" }
    });
  });

  it("converts queued preflight failures into terminal SSE errors", async () => {
    const uploadRepository = new InMemoryUploadRepository();
    const importCanFinish = deferred();
    const steps: WorkflowStep[] = [{ prompt: "only", model: "image" }];
    const stepExecutor = makeStepExecutor(async ({ steps: s, onStepStart, onStepEnd }) => {
      onStepStart?.(0, s[0]!);
      await importCanFinish.promise;
      onStepEnd?.(0, "done");
      return ["done"];
    });
    const service = new ImportService({
      uploadRepository,
      imageStorage: {
        uploadImage: vi.fn(async (_buffer, publicId) => ({
          imageUrl: `https://storage.example.test/uploads/${publicId}`,
          bucket: "b",
          objectKey: `uploads/${publicId}.jpg`
        }))
      },
      notifier: makeNotifier(),
      autoAnalyseFlagRepository: makeAutoAnalyseFlagRepository(),
      providerState: { getCurrentProvider: vi.fn(async () => "test-provider") },
      toolReasoning: { decideSteps: vi.fn(async () => steps) },
      stepExecutor,
      logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
      now: () => 3,
      generateUploadId: () => "upl_active"
    });
    const importEmit = vi.fn();
    const regenerateEmit = vi.fn();

    const importPromise = service.streamImport(
      { imageBuffer: Buffer.from("img"), imageMimeType: "image/jpeg" },
      importEmit
    );
    await waitFor(() => importEmit.mock.calls.length > 0);

    const regeneratePromise = service.streamRegenerate(
      { imageUrl: "https://storage.example.test/uploads/upl_missing-abc.jpg", text: "" },
      regenerateEmit
    );
    expect(regenerateEmit).toHaveBeenCalledWith({ status: "queued", data: { position: 1 } });

    importCanFinish.resolve();
    await importPromise;
    await expect(regeneratePromise).resolves.toBeUndefined();

    expect(regenerateEmit.mock.calls.map((c) => c[0])).toEqual([
      { status: "queued", data: { position: 1 } },
      { error: { code: "NOT_FOUND", message: "upload not found" } }
    ]);
  });
});
