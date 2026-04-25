import axios from "axios";
import type { Database } from "firebase-admin/database";
import OpenAI from "openai";
import type { LlmConfig } from "../../../libs/configs/env.config";
import { getAppVersion } from "../../../libs/utils/app-version.util";
import { createS3Client, pingS3, type S3Config } from "../../../libs/s3/s3.util";
import type { DependencyCheck, HealthReport } from "../model/health.model";

const HEALTH_REQUEST_TIMEOUT_MS = 10_000;

export function createHealthRunner(
  database: Database,
  extractLlmConfig: LlmConfig,
  finalLlmConfig: LlmConfig,
  s3Config: Pick<S3Config, "endpoint" | "accessKeyId" | "secretAccessKey" | "region" | "bucket">
) {
  return async (): Promise<HealthReport> => {
    const extractLlmCheckPromise = runDependencyCheck(() => {
      return buildLlmClient(extractLlmConfig).models.list().then(() => {});
    });
    const finalLlmCheckPromise = isSameLlmHealthTarget(extractLlmConfig, finalLlmConfig)
      ? extractLlmCheckPromise
      : runDependencyCheck(() => {
          return buildLlmClient(finalLlmConfig).models.list().then(() => {});
        });

    const s3Client = createS3Client(s3Config);
    const [firebase, extractLlm, finalLlm, s3] = await Promise.all([
      runDependencyCheck(async () => {
        await database.ref("/.info/serverTimeOffset").once("value");
      }),
      extractLlmCheckPromise,
      finalLlmCheckPromise,
      runDependencyCheck(() => pingS3(s3Client, s3Config.bucket))
    ]);
    const llm = combineLlmChecks(extractLlm, finalLlm);

    return {
      version: getAppVersion(),
      ok: firebase.ok && llm.ok && s3.ok,
      firebase,
      llm,
      s3
    };
  };
}

function buildLlmClient(config: LlmConfig) {
  return new OpenAI({
    apiKey: config.apiKey,
    ...(config.baseURL ? { baseURL: config.baseURL } : {}),
    timeout: HEALTH_REQUEST_TIMEOUT_MS
  });
}

function isSameLlmHealthTarget(left: LlmConfig, right: LlmConfig): boolean {
  return (
    left.provider === right.provider &&
    left.apiKey === right.apiKey &&
    (left.baseURL ?? "") === (right.baseURL ?? "")
  );
}

function combineLlmChecks(extractLlm: DependencyCheck, finalLlm: DependencyCheck): DependencyCheck {
  const latencyMs = Math.max(extractLlm.latencyMs, finalLlm.latencyMs);

  if (extractLlm.ok && finalLlm.ok) {
    return { ok: true, latencyMs };
  }

  const errors: string[] = [];
  if (!extractLlm.ok) {
    errors.push(`extract: ${extractLlm.error ?? "unknown error"}`);
  }
  if (!finalLlm.ok) {
    errors.push(`final: ${finalLlm.error ?? "unknown error"}`);
  }

  return {
    ok: false,
    latencyMs,
    error: errors.join("; ")
  };
}

async function runDependencyCheck(check: () => Promise<void>): Promise<DependencyCheck> {
  const startedAt = Date.now();
  try {
    await check();
    return { ok: true, latencyMs: Date.now() - startedAt };
  } catch (error) {
    return { ok: false, latencyMs: Date.now() - startedAt, error: summarizeError(error) };
  }
}

function summarizeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED") {
      return "request timed out";
    }
    if (error.response) {
      return `HTTP ${error.response.status}`;
    }
    if (error.message) {
      return error.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "unknown error";
}
