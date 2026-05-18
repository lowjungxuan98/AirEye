import path from "node:path";
import OpenAI from "openai";
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
import { resolveS3Bucket } from "./libs/configs/env.config";
import { ProviderOrchestrator } from "./libs/utils/provider_orchestrator.util";
import { LiteLlmModelDiscovery } from "./libs/llm/model-discovery";

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
  const llmClient = new OpenAI({ apiKey: env.LLM_API_KEY, baseURL: env.LLM_BASE_URL });
  const modelDiscovery = new LiteLlmModelDiscovery({
    baseUrl: env.LLM_BASE_URL,
    apiKey: env.LLM_API_KEY
  });
  const providerOrchestrator = new ProviderOrchestrator({
    client: llmClient,
    getAvailableProviders: () => modelDiscovery.getAvailableProviders(),
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
    runHealthChecks: createHealthRunner(realtimeDb, env.LLM_BASE_URL, env.LLM_API_KEY, s3Config),
    logger: console,
    promptSettings,
    promptAdminSecret: env.GRIM_PROMPT_ADMIN_SECRET
  };
}
