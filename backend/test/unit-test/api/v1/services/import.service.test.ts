import { describe, expect, it, vi } from "vitest";
import { ImportService } from "../../../../../src/api/v1/services/import.service";
import {
  IMPORT_WORKFLOW_CONCURRENCY,
  InProcessImportWorkflowQueue
} from "../../../../../src/api/v1/services/import-workflow.queue";
import { InMemoryUploadRepository } from "../../../../in-memory-upload-repository";
import { ApiError } from "../../../../../src/libs/utils/api-error.util";
import type {
  ImportWorkflowJob,
  ImportWorkflowProcessor
} from "../../../../../src/api/v1/model/services.model";

function makeImageStorage() {
  return {
    uploadImage: vi.fn(async (_buffer: Buffer, _publicId: string, _mimeType: string) => ({
      imageUrl: "https://storage.example.test/uploads/upl_testid.jpg",
      bucket: "b",
      objectKey: "uploads/upl_testid.jpg"
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

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function waitFor(predicate: () => boolean | Promise<boolean>): Promise<void> {
  for (let i = 0; i < 100; i += 1) {
    if (await predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  throw new Error("Timed out waiting for condition");
}

function createManualQueue() {
  let processor!: ImportWorkflowProcessor;
  const jobs: ImportWorkflowJob[] = [];
  const queue = {
    enqueue: vi.fn(async (job: ImportWorkflowJob) => {
      jobs.push(job);
      return { jobId: `job_${jobs.length}` };
    })
  };

  return {
    jobs,
    queue,
    run: async (index = 0) => processor(jobs[index]!),
    factory: (nextProcessor: ImportWorkflowProcessor) => {
      processor = nextProcessor;
      return queue;
    }
  };
}

function makeService({
  uploadRepository = new InMemoryUploadRepository(),
  imageStorage = makeImageStorage(),
  notifier = makeNotifier(),
  autoAnalyseFlagRepository = makeAutoAnalyseFlagRepository(),
  providerState = { getCurrentProvider: vi.fn(async () => "test-provider") },
  workflowRunner = {
    run: vi.fn(async () => ({ extractedText: "extracted", finalText: "final" }))
  },
  logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  now = () => 99,
  generateUploadId = () => "upl_testid",
  workflowQueueFactory = undefined
}: Partial<ConstructorParameters<typeof ImportService>[0]> = {}) {
  return {
    uploadRepository,
    imageStorage,
    notifier,
    autoAnalyseFlagRepository,
    providerState,
    workflowRunner,
    logger,
    service: new ImportService({
      uploadRepository,
      imageStorage,
      notifier,
      autoAnalyseFlagRepository,
      providerState,
      workflowRunner,
      logger,
      now,
      generateUploadId,
      workflowQueueFactory
    })
  };
}

describe("ImportService queueImport", () => {
  it("stores the image, creates a pending row, broadcasts refresh, enqueues metadata, and returns 202 body data", async () => {
    const manualQueue = createManualQueue();
    const imageStorage = makeImageStorage();
    const notifier = makeNotifier();
    const { service, uploadRepository, workflowRunner } = makeService({
      imageStorage,
      notifier,
      workflowQueueFactory: manualQueue.factory
    });

    const response = await service.queueImport({
      imageBuffer: Buffer.from("img"),
      imageMimeType: "image/png"
    });

    expect(response).toEqual({ status: "queued", jobId: "job_1", uploadId: "upl_testid" });
    expect(imageStorage.uploadImage).toHaveBeenCalledWith(
      Buffer.from("img"),
      "upl_testid",
      "image/png"
    );
    expect(await uploadRepository.getUpload("upl_testid")).toMatchObject({
      id: "upl_testid",
      createdAt: 99,
      updatedAt: 99,
      imageUrl: "https://storage.example.test/uploads/upl_testid.jpg",
      bucket: "b",
      objectKey: "uploads/upl_testid.jpg"
    });
    expect(notifier.broadcastExportRefresh).toHaveBeenCalledOnce();
    expect(manualQueue.jobs).toEqual([
      {
        kind: "import",
        upload: {
          uploadId: "upl_testid",
          imageUrl: "https://storage.example.test/uploads/upl_testid.jpg",
          bucket: "b",
          objectKey: "uploads/upl_testid.jpg"
        }
      }
    ]);
    expect(JSON.stringify(manualQueue.jobs[0])).not.toContain("imageBuffer");
    expect(workflowRunner.run).not.toHaveBeenCalled();
  });

  it("throws before creating a row when storage upload fails", async () => {
    const manualQueue = createManualQueue();
    const uploadRepository = new InMemoryUploadRepository();
    const { service, notifier } = makeService({
      uploadRepository,
      imageStorage: { uploadImage: vi.fn(async () => null) },
      workflowQueueFactory: manualQueue.factory
    });

    await expect(
      service.queueImport({ imageBuffer: Buffer.from("img"), imageMimeType: "image/jpeg" })
    ).rejects.toMatchObject({ code: "INTERNAL_ERROR", message: "upload failed" });
    expect(await uploadRepository.getUpload("upl_testid")).toBeNull();
    expect(manualQueue.queue.enqueue).not.toHaveBeenCalled();
    expect(notifier.broadcastExportRefresh).not.toHaveBeenCalled();
  });

  it("persists enqueue failure on the pending row and broadcasts another refresh", async () => {
    const queue = {
      enqueue: vi.fn(async () => {
        throw new Error("redis down");
      })
    };
    const { service, uploadRepository, notifier } = makeService({
      workflowQueueFactory: () => queue
    });

    await expect(
      service.queueImport({ imageBuffer: Buffer.from("img"), imageMimeType: "image/jpeg" })
    ).rejects.toThrow("redis down");

    expect(await uploadRepository.getUpload("upl_testid")).toMatchObject({
      id: "upl_testid",
      errorMessage: "redis down"
    });
    expect(notifier.broadcastExportRefresh).toHaveBeenCalledTimes(2);
  });
});

describe("ImportService import worker", () => {
  it("runs the workflow later and updates extractedText/finalText", async () => {
    const manualQueue = createManualQueue();
    const workflowRunner = {
      run: vi.fn(async () => ({ extractedText: "extracted", finalText: "final" }))
    };
    const notifier = makeNotifier();
    const { service, uploadRepository, providerState } = makeService({
      notifier,
      workflowRunner,
      workflowQueueFactory: manualQueue.factory
    });

    await service.queueImport({ imageBuffer: Buffer.from("img"), imageMimeType: "image/png" });
    await manualQueue.run();

    expect(providerState.getCurrentProvider).toHaveBeenCalledOnce();
    expect(workflowRunner.run).toHaveBeenCalledWith({
      provider: "test-provider",
      imageUrl: "https://storage.example.test/uploads/upl_testid.jpg",
      kind: "import"
    });
    expect(await uploadRepository.getUpload("upl_testid")).toMatchObject({
      extractedText: "extracted",
      finalText: "final",
      errorMessage: ""
    });
    expect(notifier.broadcastExportRefresh).toHaveBeenCalledTimes(2);
  });

  it("leaves the image-only pending row as terminal when auto_analyse is disabled", async () => {
    const manualQueue = createManualQueue();
    const { service, uploadRepository, providerState, workflowRunner, notifier } =
      makeService({
        autoAnalyseFlagRepository: makeAutoAnalyseFlagRepository(false),
        workflowQueueFactory: manualQueue.factory
      });

    await service.queueImport({ imageBuffer: Buffer.from("img"), imageMimeType: "image/png" });
    await manualQueue.run();

    const row = await uploadRepository.getUpload("upl_testid");
    expect(row?.imageUrl).toBe("https://storage.example.test/uploads/upl_testid.jpg");
    expect(row?.extractedText).toBeUndefined();
    expect(row?.finalText).toBeUndefined();
    expect(providerState.getCurrentProvider).not.toHaveBeenCalled();
    expect(workflowRunner.run).not.toHaveBeenCalled();
    expect(notifier.broadcastExportRefresh).toHaveBeenCalledOnce();
  });

  it("persists workflow failures and broadcasts refresh", async () => {
    const manualQueue = createManualQueue();
    const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };
    const notifier = makeNotifier();
    const { service, uploadRepository } = makeService({
      notifier,
      logger,
      workflowRunner: {
        run: vi.fn(async () => {
          throw new Error("workflow failed");
        })
      },
      workflowQueueFactory: manualQueue.factory
    });
    const updateUpload = vi.spyOn(uploadRepository, "updateUpload");

    await service.queueImport({ imageBuffer: Buffer.from("img"), imageMimeType: "image/png" });
    await manualQueue.run();

    const row = await uploadRepository.getUpload("upl_testid");
    expect(row).toMatchObject({
      imageUrl: "https://storage.example.test/uploads/upl_testid.jpg",
      bucket: "b",
      objectKey: "uploads/upl_testid.jpg",
      finalText: "workflow failed"
    });
    expect(row?.errorMessage).toBeUndefined();
    expect(updateUpload).toHaveBeenCalledOnce();
    expect(updateUpload.mock.calls[0]?.[1]).not.toHaveProperty("errorMessage");
    expect(updateUpload.mock.invocationCallOrder[0]!).toBeLessThan(
      notifier.broadcastExportRefresh.mock.invocationCallOrder[1]!
    );
    expect(notifier.broadcastExportRefresh).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenCalledWith("import pipeline failed", expect.any(Error));
  });

  it("persists ApiError messages from workflow failures", async () => {
    const manualQueue = createManualQueue();
    const { service, uploadRepository } = makeService({
      workflowRunner: {
        run: vi.fn(async () => {
          throw new ApiError(503, "UPSTREAM", "nim down");
        })
      },
      workflowQueueFactory: manualQueue.factory
    });

    await service.queueImport({ imageBuffer: Buffer.from("img"), imageMimeType: "image/png" });
    await manualQueue.run();

    const row = await uploadRepository.getUpload("upl_testid");
    expect(row).toMatchObject({
      imageUrl: "https://storage.example.test/uploads/upl_testid.jpg",
      finalText: "nim down"
    });
    expect(row?.errorMessage).toBeUndefined();
  });
});

describe("ImportService queueRegenerate", () => {
  it("validates the existing row, enqueues stored image metadata, and returns 202 body data", async () => {
    const manualQueue = createManualQueue();
    const uploadRepository = new InMemoryUploadRepository();
    await uploadRepository.createPendingUpload("upl_existing", {
      createdAt: 10,
      updatedAt: 11,
      imageUrl: "https://storage.example.test/uploads/upl_existing-abc.jpg",
      bucket: "b",
      objectKey: "uploads/upl_existing-abc.jpg"
    });
    const { service } = makeService({
      uploadRepository,
      workflowQueueFactory: manualQueue.factory
    });

    const response = await service.queueRegenerate({
      imageUrl: "https://storage.example.test/uploads/upl_existing-abc.jpg",
      text: "old"
    });

    expect(response).toEqual({ status: "queued", jobId: "job_1", uploadId: "upl_existing" });
    expect(manualQueue.jobs).toEqual([
      {
        kind: "regenerate",
        upload: {
          uploadId: "upl_existing",
          imageUrl: "https://storage.example.test/uploads/upl_existing-abc.jpg",
          bucket: "b",
          objectKey: "uploads/upl_existing-abc.jpg"
        },
        request: {
          imageUrl: "https://storage.example.test/uploads/upl_existing-abc.jpg",
          text: "old"
        }
      }
    ]);
  });

  it("throws NOT_FOUND before enqueue when the upload row is missing", async () => {
    const manualQueue = createManualQueue();
    const { service } = makeService({ workflowQueueFactory: manualQueue.factory });

    await expect(
      service.queueRegenerate({
        imageUrl: "https://storage.example.test/uploads/upl_missing-abc.jpg",
        text: ""
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(manualQueue.queue.enqueue).not.toHaveBeenCalled();
  });

  it("throws INVALID_REQUEST when imageUrl does not contain an upload object name", async () => {
    const manualQueue = createManualQueue();
    const { service } = makeService({ workflowQueueFactory: manualQueue.factory });

    await expect(
      service.queueRegenerate({
        imageUrl: "https://storage.example.test/uploads/no-upload.jpg",
        text: ""
      })
    ).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  });

  it("persists enqueue failure on the existing row and broadcasts refresh", async () => {
    const uploadRepository = new InMemoryUploadRepository();
    await uploadRepository.createPendingUpload("upl_existing", {
      createdAt: 10,
      updatedAt: 11,
      imageUrl: "https://storage.example.test/uploads/upl_existing-abc.jpg"
    });
    const queue = {
      enqueue: vi.fn(async () => {
        throw new Error("redis down");
      })
    };
    const { service, notifier } = makeService({
      uploadRepository,
      workflowQueueFactory: () => queue
    });

    await expect(
      service.queueRegenerate({
        imageUrl: "https://storage.example.test/uploads/upl_existing-abc.jpg",
        text: ""
      })
    ).rejects.toThrow("redis down");
    expect(await uploadRepository.getUpload("upl_existing")).toMatchObject({
      errorMessage: "redis down"
    });
    expect(notifier.broadcastExportRefresh).toHaveBeenCalledOnce();
  });
});

describe("ImportService regenerate worker", () => {
  it("clears stale output, reruns the workflow, and updates the existing row", async () => {
    const manualQueue = createManualQueue();
    const uploadRepository = new InMemoryUploadRepository();
    await uploadRepository.createPendingUpload("upl_existing", {
      createdAt: 10,
      updatedAt: 11,
      extractedText: "old extracted",
      finalText: "old final",
      errorMessage: "old error",
      imageUrl: "https://storage.example.test/uploads/upl_existing-abc.jpg",
      bucket: "b",
      objectKey: "uploads/upl_existing-abc.jpg"
    });
    const notifier = makeNotifier();
    const workflowRunner = {
      run: vi.fn(async () => ({ extractedText: "extracted", finalText: "final" }))
    };
    let now = 100;
    const { service, providerState } = makeService({
      uploadRepository,
      notifier,
      workflowRunner,
      now: () => now++,
      workflowQueueFactory: manualQueue.factory
    });

    await service.queueRegenerate({
      imageUrl: "https://storage.example.test/uploads/upl_existing-abc.jpg",
      text: "old final"
    });
    await manualQueue.run();

    expect(workflowRunner.run).toHaveBeenCalledWith({
      provider: "test-provider",
      imageUrl: "https://storage.example.test/uploads/upl_existing-abc.jpg",
      kind: "regenerate"
    });
    expect(providerState.getCurrentProvider).toHaveBeenCalledOnce();
    expect(await uploadRepository.getUpload("upl_existing")).toMatchObject({
      createdAt: 10,
      updatedAt: 101,
      extractedText: "extracted",
      finalText: "final",
      errorMessage: ""
    });
    expect(notifier.broadcastExportRefresh).toHaveBeenCalledTimes(2);
  });

  it("persists regenerate workflow failures and broadcasts refresh", async () => {
    const manualQueue = createManualQueue();
    const uploadRepository = new InMemoryUploadRepository();
    await uploadRepository.createPendingUpload("upl_existing", {
      createdAt: 10,
      updatedAt: 11,
      extractedText: "old extracted",
      finalText: "old final",
      errorMessage: "old error",
      imageUrl: "https://storage.example.test/uploads/upl_existing-abc.jpg",
      bucket: "b",
      objectKey: "uploads/upl_existing-abc.jpg"
    });
    const updateUpload = vi.spyOn(uploadRepository, "updateUpload");
    const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };
    const notifier = makeNotifier();
    const { service } = makeService({
      uploadRepository,
      notifier,
      logger,
      workflowRunner: {
        run: vi.fn(async () => {
          throw new Error("step failed");
        })
      },
      workflowQueueFactory: manualQueue.factory
    });

    await service.queueRegenerate({
      imageUrl: "https://storage.example.test/uploads/upl_existing-abc.jpg",
      text: ""
    });
    await manualQueue.run();

    const row = await uploadRepository.getUpload("upl_existing");
    expect(row).toMatchObject({
      imageUrl: "https://storage.example.test/uploads/upl_existing-abc.jpg",
      bucket: "b",
      objectKey: "uploads/upl_existing-abc.jpg",
      extractedText: "",
      finalText: "step failed",
      errorMessage: ""
    });
    expect(updateUpload).toHaveBeenNthCalledWith(
      1,
      "upl_existing",
      expect.objectContaining({
        extractedText: "",
        finalText: "",
        errorMessage: ""
      })
    );
    expect(updateUpload).toHaveBeenNthCalledWith(
      2,
      "upl_existing",
      expect.objectContaining({
        finalText: "step failed"
      })
    );
    expect(updateUpload.mock.calls[1]?.[1]).not.toHaveProperty("errorMessage");
    expect(updateUpload.mock.invocationCallOrder[1]!).toBeLessThan(
      notifier.broadcastExportRefresh.mock.invocationCallOrder[1]!
    );
    expect(notifier.broadcastExportRefresh).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenCalledWith("regenerate pipeline failed", expect.any(Error));
  });
});

describe("Import workflow queue", () => {
  it("processes in-process jobs FIFO with concurrency one while enqueue returns immediately", async () => {
    const firstCanFinish = deferred();
    const runOrder: string[] = [];
    const queue = new InProcessImportWorkflowQueue(async (job) => {
      const label = job.kind === "import" ? job.upload.uploadId : job.upload.uploadId;
      runOrder.push(`${label}:start`);
      if (label === "upl_first") {
        await firstCanFinish.promise;
      }
      runOrder.push(`${label}:end`);
    });

    const first = await queue.enqueue({
      kind: "import",
      upload: { uploadId: "upl_first", imageUrl: "https://img/first.jpg" }
    });
    const second = await queue.enqueue({
      kind: "import",
      upload: { uploadId: "upl_second", imageUrl: "https://img/second.jpg" }
    });

    expect(first.jobId).toEqual(expect.any(String));
    expect(second.jobId).toEqual(expect.any(String));
    await waitFor(() => runOrder.includes("upl_first:start"));
    expect(runOrder).toEqual(["upl_first:start"]);

    firstCanFinish.resolve();
    await waitFor(() => runOrder.includes("upl_second:end"));
    expect(runOrder).toEqual([
      "upl_first:start",
      "upl_first:end",
      "upl_second:start",
      "upl_second:end"
    ]);
  });

  it("keeps BullMQ worker and global concurrency configured to one", () => {
    expect(IMPORT_WORKFLOW_CONCURRENCY).toBe(1);
  });
});
