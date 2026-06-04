import { randomUUID } from "node:crypto";
import { Queue, Worker, type JobsOptions, type RedisOptions } from "bullmq";
import type {
  ImportWorkflowJob,
  ImportWorkflowProcessor,
  ImportWorkflowQueue,
  Logger
} from "../model/services.model";
import type { UploadedWorkflowImage } from "../model/import.model";
import type { RegenerateRequest } from "../model/regenerate.model";

type SerializedImportWorkflowJob =
  | {
      kind: "import";
      upload: UploadedWorkflowImage;
    }
  | {
      kind: "regenerate";
      upload: UploadedWorkflowImage;
      request: RegenerateRequest;
    };

const QUEUE_NAME = "import-workflows";
const JOB_NAME = "run";
export const IMPORT_WORKFLOW_CONCURRENCY = 1;

export class InProcessImportWorkflowQueue implements ImportWorkflowQueue {
  private active = false;
  private readonly waiting: Array<{ jobId: string; job: ImportWorkflowJob }> = [];

  constructor(
    private readonly processor: ImportWorkflowProcessor,
    private readonly logger: Logger = console
  ) {}

  async enqueue(job: ImportWorkflowJob): Promise<{ jobId: string }> {
    const jobId = randomUUID();
    this.waiting.push({ jobId, job });
    this.drain();
    return { jobId };
  }

  private drain(): void {
    if (this.active) {
      return;
    }

    const next = this.waiting.shift();
    if (!next) {
      return;
    }

    this.active = true;
    void (async () => {
      try {
        await this.processor(next.job);
      } catch (error) {
        this.logger.error("in-process import workflow job failed", error);
      } finally {
        this.active = false;
        this.drain();
      }
    })();
  }
}

export type BullMqImportWorkflowQueueOptions = {
  redisUrl: string;
  processor: ImportWorkflowProcessor;
  logger?: Logger;
};

export class BullMqImportWorkflowQueue implements ImportWorkflowQueue {
  private readonly queue: Queue<SerializedImportWorkflowJob, void, typeof JOB_NAME>;
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
    this.worker = new Worker<SerializedImportWorkflowJob, void, typeof JOB_NAME>(
      QUEUE_NAME,
      async (job) => {
        await processor(deserializeJob(job.data));
      },
      { connection, concurrency: IMPORT_WORKFLOW_CONCURRENCY }
    );

    this.queue.on("error", (error) => logger.error("BullMQ import queue error", error));
    this.worker.on("error", (error) => logger.error("BullMQ import worker error", error));
    this.worker.on("failed", (_job, error) =>
      logger.error("BullMQ import workflow job failed", error)
    );

    this.ready = Promise.all([
      this.queue.waitUntilReady(),
      this.worker.waitUntilReady(),
      this.queue.setGlobalConcurrency(IMPORT_WORKFLOW_CONCURRENCY)
    ]).then(() => undefined);
  }

  async enqueue(job: ImportWorkflowJob): Promise<{ jobId: string }> {
    await this.ready;

    const jobId = randomUUID();
    await this.queue.add(JOB_NAME, serializeJob(job), { jobId });
    return { jobId };
  }

  async close(): Promise<void> {
    await Promise.all([this.worker.close(), this.queue.close()]);
  }
}

function parseRedisConnection(redisUrl: string): RedisOptions {
  return { url: redisUrl, maxRetriesPerRequest: null };
}

function serializeJob(job: ImportWorkflowJob): SerializedImportWorkflowJob {
  return job;
}

function deserializeJob(job: SerializedImportWorkflowJob): ImportWorkflowJob {
  return job;
}
