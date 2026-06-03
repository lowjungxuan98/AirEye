import { randomUUID } from "node:crypto";
import {
  Job,
  Queue,
  QueueEvents,
  Worker,
  type JobsOptions,
  type RedisOptions
} from "bullmq";
import type {
  ImportWorkflowJob,
  ImportWorkflowProcessor,
  ImportWorkflowQueue,
  ImportStreamEmitter,
  Logger
} from "../model/services.model";
import type { RegenerateRequest } from "../model/regenerate.model";
import { ApiError } from "../../../libs/utils/api-error.util";
import { mapRequestError } from "../../../libs/utils/http.util";
import type { ImportStreamSseData } from "../model/import.model";

type SerializedImportWorkflowJob =
  | {
      kind: "import";
      request: {
        imageBufferBase64: string;
        imageMimeType: string;
      };
    }
  | {
      kind: "regenerate";
      request: RegenerateRequest;
    };

type QueueProgress = {
  event: ImportStreamSseData;
};

type QueueFailure = {
  statusCode: number;
  code: string;
  message: string;
};

const QUEUE_NAME = "import-workflows";
const JOB_NAME = "run";
const QUEUED_FAILURE_FALLBACK: QueueFailure = {
  statusCode: 500,
  code: "INTERNAL_ERROR",
  message: "Processing failed"
};

export class InProcessImportWorkflowQueue implements ImportWorkflowQueue {
  private active = false;
  private readonly waiting: Array<() => void> = [];

  constructor(private readonly processor: ImportWorkflowProcessor) {}

  enqueue(job: ImportWorkflowJob, emit: ImportStreamEmitter): Promise<void> {
    const jobsAhead = this.active ? this.waiting.length + 1 : 0;
    if (jobsAhead > 0) {
      emit({ status: "queued", data: { position: jobsAhead } });
    }

    return new Promise<void>((resolve, reject) => {
      const run = () => {
        this.active = true;
        void (async () => {
          try {
            await this.processor(job, emit);
            resolve();
          } catch (error) {
            if (jobsAhead > 0) {
              const { code, message } = toQueueFailure(error);
              emit({ error: { code, message } });
              resolve();
              return;
            }

            reject(error);
          } finally {
            this.advance();
          }
        })();
      };

      if (this.active) {
        this.waiting.push(run);
        return;
      }

      run();
    });
  }

  private advance(): void {
    const next = this.waiting.shift();
    if (next) {
      next();
      return;
    }

    this.active = false;
  }
}

export type BullMqImportWorkflowQueueOptions = {
  redisUrl: string;
  processor: ImportWorkflowProcessor;
  logger?: Logger;
};

export class BullMqImportWorkflowQueue implements ImportWorkflowQueue {
  private readonly queue: Queue<SerializedImportWorkflowJob, void, typeof JOB_NAME>;
  private readonly queueEvents: QueueEvents;
  private readonly worker: Worker<SerializedImportWorkflowJob, void, typeof JOB_NAME>;
  private readonly ready: Promise<void>;

  constructor({ redisUrl, processor, logger = console }: BullMqImportWorkflowQueueOptions) {
    const connection = parseRedisConnection(redisUrl);
    const defaultJobOptions: JobsOptions = {
      attempts: 1,
      removeOnComplete: { age: 3600, count: 1000 },
      removeOnFail: { age: 3600, count: 1000 }
    };

    this.queue = new Queue<SerializedImportWorkflowJob, void, typeof JOB_NAME>(QUEUE_NAME, {
      connection,
      defaultJobOptions
    });
    this.queueEvents = new QueueEvents(QUEUE_NAME, { connection });
    this.worker = new Worker<SerializedImportWorkflowJob, void, typeof JOB_NAME>(
      QUEUE_NAME,
      async (job) => {
        let progressChain = Promise.resolve();
        const emit = (data: ImportStreamSseData) => {
          progressChain = progressChain.then(() =>
            job.updateProgress({ event: data } satisfies QueueProgress)
          );
        };

        try {
          await processor(deserializeJob(job.data), emit);
          await progressChain;
        } catch (error) {
          throw new Error(JSON.stringify(toQueueFailure(error)));
        }
      },
      { connection, concurrency: 1 }
    );

    this.queue.on("error", (error) => logger.error("BullMQ import queue error", error));
    this.queueEvents.on("error", (error) =>
      logger.error("BullMQ import queue events error", error)
    );
    this.worker.on("error", (error) => logger.error("BullMQ import worker error", error));
    this.worker.on("failed", (_job, error) =>
      logger.error("BullMQ import workflow job failed", error)
    );

    this.ready = Promise.all([
      this.queue.waitUntilReady(),
      this.queueEvents.waitUntilReady(),
      this.worker.waitUntilReady(),
      this.queue.setGlobalConcurrency(1)
    ]).then(() => undefined);
  }

  async enqueue(job: ImportWorkflowJob, emit: ImportStreamEmitter): Promise<void> {
    await this.ready;

    const jobId = randomUUID();
    const progressListener = ({ jobId: progressJobId, data }: { jobId: string; data: unknown }) => {
      if (progressJobId !== jobId || !isQueueProgress(data)) {
        return;
      }

      emit(data.event);
    };
    this.queueEvents.on("progress", progressListener);

    try {
      const bullJob = await this.queue.add(JOB_NAME, serializeJob(job), { jobId });
      const jobsAhead = await this.getJobsAhead(bullJob);
      if (jobsAhead > 0) {
        emit({ status: "queued", data: { position: jobsAhead } });
      }

      try {
        await bullJob.waitUntilFinished(this.queueEvents);
      } catch (error) {
        const failure = parseQueueFailure(error);
        if (jobsAhead > 0) {
          emit({ error: { code: failure.code, message: failure.message } });
          return;
        }

        throw new ApiError(failure.statusCode, failure.code, failure.message);
      }
    } finally {
      this.queueEvents.off("progress", progressListener);
    }
  }

  async close(): Promise<void> {
    await Promise.all([this.worker.close(), this.queueEvents.close(), this.queue.close()]);
  }

  private async getJobsAhead(
    job: Job<SerializedImportWorkflowJob, void, typeof JOB_NAME>
  ): Promise<number> {
    const active = await this.queue.getActive();
    if (active.some((activeJob) => activeJob.id === job.id)) {
      return 0;
    }

    const waiting = await this.queue.getWaiting(0, -1);
    const waitingIndex = waiting.findIndex((waitingJob) => waitingJob.id === job.id);
    if (waitingIndex >= 0) {
      return active.length + waitingIndex;
    }

    const state = await job.getState();
    if (state === "active" || state === "completed") {
      return 0;
    }

    const counts = await this.queue.getJobCounts(
      "active",
      "waiting",
      "prioritized",
      "delayed",
      "waiting-children"
    );
    return Object.values(counts).reduce((sum, count) => sum + count, 0);
  }
}

function parseRedisConnection(redisUrl: string): RedisOptions {
  return { url: redisUrl, maxRetriesPerRequest: null };
}

function serializeJob(job: ImportWorkflowJob): SerializedImportWorkflowJob {
  if (job.kind === "import") {
    return {
      kind: "import",
      request: {
        imageBufferBase64: job.request.imageBuffer.toString("base64"),
        imageMimeType: job.request.imageMimeType
      }
    };
  }

  return { kind: "regenerate", request: job.request };
}

function deserializeJob(job: SerializedImportWorkflowJob): ImportWorkflowJob {
  if (job.kind === "import") {
    return {
      kind: "import",
      request: {
        imageBuffer: Buffer.from(job.request.imageBufferBase64, "base64"),
        imageMimeType: job.request.imageMimeType
      }
    };
  }

  return job;
}

function isQueueProgress(data: unknown): data is QueueProgress {
  return (
    data !== null &&
    typeof data === "object" &&
    "event" in data &&
    typeof (data as QueueProgress).event === "object"
  );
}

function toQueueFailure(error: unknown): QueueFailure {
  const apiError = mapRequestError(error);
  return {
    statusCode: apiError.statusCode,
    code: apiError.code,
    message: apiError.message
  };
}

function parseQueueFailure(error: unknown): QueueFailure {
  const raw = error instanceof Error ? error.message : String(error);
  try {
    const parsed = JSON.parse(raw) as Partial<QueueFailure>;
    if (
      typeof parsed.statusCode === "number" &&
      typeof parsed.code === "string" &&
      typeof parsed.message === "string"
    ) {
      return parsed as QueueFailure;
    }
  } catch {
    // Fall through to the generic error below.
  }

  return { ...QUEUED_FAILURE_FALLBACK, message: raw || QUEUED_FAILURE_FALLBACK.message };
}
