import path from "node:path";
import type { AppDependencies } from "./app";
import { createHealthRunner } from "./api/v1/services/health.service";
import { CaptureService } from "./api/v1/services/capture.service";
import { ExportService } from "./api/v1/services/export.service";
import { ImportService } from "./api/v1/services/import.service";
import type { ServerEnv } from "./libs/configs/env.config";
import { S3ImageStore, type S3Config } from "./libs/s3/s3.util";
import { DEFAULT_FCM_BROADCAST_TOPIC, FirebaseNotifier } from "./libs/firebase/fcm";
import { getFirebaseAdminApp } from "./libs/firebase/admin";
import {
  FirebaseProviderStateRepository,
  FirebaseUploadRepository,
  getRealtimeDb,
  type RealtimeNamespace
} from "./libs/firebase/realtime";
import { GrimPromptSettings } from "./libs/utils/prompt.util";
import {
  DEFAULT_NVIDIA_BASE_URL,
  DEFAULT_OPENROUTER_BASE_URL,
  DEFAULT_OPENROUTER_MODEL,
  type LlmConfig,
  type LlmProvider,
  resolveS3Bucket
} from "./libs/configs/env.config";
import { ProviderOrchestrator } from "./libs/utils/provider_orchestrator.util";

type ProviderStageConfig = {
  extract: LlmConfig;
  final: LlmConfig;
};

export function createProductionDependencies(env: ServerEnv): AppDependencies {
  const promptsDir = env.GRIM_PROMPTS_DIR ?? path.resolve(__dirname, "..", "prompts");
  const promptSettings = GrimPromptSettings.loadFromDirectory(promptsDir);
  const firebaseApp = getFirebaseAdminApp(env);
  const realtimeDb = getRealtimeDb(firebaseApp);
  const namespace: RealtimeNamespace =
    (process.env.NODE_ENV ?? "development").trim().toLowerCase() === "production"
      ? "production"
      : "development";
  const uploadRepository = new FirebaseUploadRepository(realtimeDb, namespace);
  const providerStateRepository = new FirebaseProviderStateRepository(realtimeDb, namespace);
  const exportService = new ExportService(uploadRepository);
  const notifier = new FirebaseNotifier(
    firebaseApp,
    env.GRIM_FCM_TOPIC ?? DEFAULT_FCM_BROADCAST_TOPIC
  );
  const captureService = new CaptureService(notifier);
  const s3Config: S3Config = {
    endpoint: env.S3_ENDPOINT,
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    region: env.S3_REGION,
    bucket: resolveS3Bucket(env),
    presignTtlSeconds: env.S3_PRESIGN_TTL_SECONDS
  };
  const providerOrchestrator = new ProviderOrchestrator({
    providers: buildProviderConfigs(env),
    defaultProvider: env.EXTRACT_LLM.provider,
    stateRepository: providerStateRepository,
    getExtractPromptText: () => promptSettings.getExtractTextPrompt(),
    getAnalyzingSystemPrompt: () => promptSettings.getAnalyzingTextPrompt(),
    getFormatGuardSystemPrompt: () => promptSettings.getFormatGuardPrompt()
  });
  const importService = new ImportService({
    uploadRepository,
    textExtractor: providerOrchestrator,
    finalTextBuilder: providerOrchestrator,
    finalTextFormatGuard: providerOrchestrator,
    imageStorage: new S3ImageStore(s3Config),
    notifier,
    logger: console
  });

  return {
    importService,
    exportService,
    captureService,
    providerService: providerOrchestrator,
    runHealthChecks: createHealthRunner(realtimeDb, env.EXTRACT_LLM, env.FINAL_LLM, s3Config),
    logger: console,
    promptSettings,
    promptAdminSecret: env.GRIM_PROMPT_ADMIN_SECRET
  };
}

function buildProviderConfigs(env: ServerEnv): Partial<Record<LlmProvider, ProviderStageConfig>> {
  const providers: Partial<Record<LlmProvider, ProviderStageConfig>> = {};

  for (const provider of ["openrouter", "openai", "nvidia_nim"] as const) {
    const config = readProviderConfigFromEnv(provider);
    if (config) {
      providers[provider] = config;
    }
  }

  providers[env.EXTRACT_LLM.provider] ??= {
    extract: env.EXTRACT_LLM,
    final: env.FINAL_LLM
  };

  return providers;
}

function readProviderConfigFromEnv(provider: LlmProvider): ProviderStageConfig | null {
  const prefix = provider === "nvidia_nim" ? "NVIDIA" : provider.toUpperCase();
  const legacyPrefix = provider === "nvidia_nim" ? "NVIDIA_NIM" : prefix;
  const apiKey = process.env[`${prefix}_API_KEY`]?.trim();
  if (!apiKey) {
    return null;
  }

  const extractModel =
    process.env[`${prefix}_EXTRACT_MODEL`]?.trim() ||
    process.env[`${legacyPrefix}_EXTRACT_MODEL`]?.trim() ||
    process.env[`${prefix}_MODEL`]?.trim() ||
    process.env[`${legacyPrefix}_MODEL`]?.trim() ||
    (provider === "openrouter"
      ? process.env.OPENROUTER_IMAGE_MODEL?.trim() || process.env.OPENROUTER_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL
      : undefined);
  const finalModel =
    process.env[`${prefix}_FINAL_MODEL`]?.trim() ||
    process.env[`${legacyPrefix}_FINAL_MODEL`]?.trim() ||
    process.env[`${prefix}_MODEL`]?.trim() ||
    process.env[`${legacyPrefix}_MODEL`]?.trim() ||
    (provider === "openrouter"
      ? process.env.OPENROUTER_MODEL?.trim() || process.env.OPENROUTER_IMAGE_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL
      : undefined);
  if (!extractModel || !finalModel) {
    return null;
  }

  const baseURL =
    process.env[`${prefix}_BASE_URL`]?.trim() ||
    process.env[`${legacyPrefix}_BASE_URL`]?.trim() ||
    (provider === "openrouter" ? DEFAULT_OPENROUTER_BASE_URL : undefined);
  const resolvedBaseURL =
    baseURL || (provider === "nvidia_nim" ? DEFAULT_NVIDIA_BASE_URL : undefined);

  return {
    extract: {
      provider,
      apiKey,
      model: extractModel,
      baseURL: resolvedBaseURL
    },
    final: {
      provider,
      apiKey,
      model: finalModel,
      baseURL: resolvedBaseURL
    }
  };
}
