import axios from "axios";
import type { Database } from "firebase-admin/database";
import OpenAI from "openai";
import { getAppVersion } from "../../../libs/utils/app-version.util";
import { createS3Client, pingS3, type S3Config } from "../../../libs/s3/s3.util";
import type { DependencyCheck, HealthReport } from "../model/health.model";

const HEALTH_REQUEST_TIMEOUT_MS = 10_000;

export function createHealthRunner(
  database: Database,
  llmBaseUrl: string,
  llmApiKey: string,
  s3Config: Pick<S3Config, "endpoint" | "accessKeyId" | "secretAccessKey" | "region" | "bucket">
) {
  return async (): Promise<HealthReport> => {
    const llmClient = new OpenAI({ apiKey: llmApiKey, baseURL: llmBaseUrl, timeout: HEALTH_REQUEST_TIMEOUT_MS });
    const s3Client = createS3Client(s3Config);

    const [firebase, llm, s3] = await Promise.all([
      runDependencyCheck(async () => {
        await database.ref("/.info/serverTimeOffset").once("value");
      }),
      runDependencyCheck(() => llmClient.models.list().then(() => {})),
      runDependencyCheck(() => pingS3(s3Client, s3Config.bucket))
    ]);

    return {
      version: getAppVersion(),
      ok: firebase.ok && llm.ok && s3.ok,
      firebase,
      llm,
      s3
    };
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
