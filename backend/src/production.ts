import type { AppDependencies } from "./app";
import { createHealthRunner } from "./api/v1/services/health.service";
import { SendNotificationService } from "./api/v1/services/send-notification.service";
import { ExportService } from "./api/v1/services/export.service";
import { ImportService } from "./api/v1/services/import.service";
import type { ServerEnv } from "./libs/configs/env.config";
import { S3ImageStore } from "./libs/s3/client";
import type { S3Config } from "./libs/s3/type";
import { DEFAULT_FCM_BROADCAST_TOPIC, FirebaseNotifier } from "./libs/firebase/export";
import { getFirebaseAdminApp } from "./libs/firebase/admin";
import {
  FirebaseProviderStateRepository,
  FirebaseUploadRepository,
  getRealtimeDb,
  type RealtimeNamespace
} from "./libs/firebase/realtime";
import { resolveFcmBroadcastTopic, resolveS3Bucket } from "./libs/configs/env.config";
import { LangfuseClient } from "./libs/langfuse/client";
import { LiteLlmClient } from "./libs/litellm/client";
import { ProviderStateService } from "./libs/litellm/provider-state";
import { ToolReasoning } from "./libs/workflow/tool-reasoning";
import { StepExecutor } from "./libs/workflow/step-executor";

const DEFAULT_LANGFUSE_LABEL = "production";

export function createProductionDependencies(env: ServerEnv): AppDependencies {
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
    resolveFcmBroadcastTopic(env, DEFAULT_FCM_BROADCAST_TOPIC)
  );
  const sendNotificationService = new SendNotificationService(notifier);
  const s3Config: S3Config = {
    endpoint: env.S3_ENDPOINT,
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    region: env.S3_REGION,
    bucket: resolveS3Bucket(env),
    presignTtlSeconds: env.S3_PRESIGN_TTL_SECONDS
  };

  const langfuseLabel = env.LANGFUSE_LABEL ?? DEFAULT_LANGFUSE_LABEL;
  const langfuse = new LangfuseClient({
    baseUrl: env.LANGFUSE_BASE_URL,
    publicKey: env.LANGFUSE_PUBLIC_KEY,
    secretKey: env.LANGFUSE_SECRET_KEY,
    defaultLabel: langfuseLabel
  });
  const litellm = new LiteLlmClient({ baseUrl: env.LLM_BASE_URL, apiKey: env.LLM_API_KEY });
  const providerState = new ProviderStateService({
    litellm,
    stateRepository: providerStateRepository
  });
  const toolReasoning = new ToolReasoning({
    langfuse,
    litellm,
    toolPromptName: env.TOOL_REASONING_PROMPT_NAME,
    label: langfuseLabel
  });
  const stepExecutor = new StepExecutor({ langfuse, litellm, label: langfuseLabel });

  const importService = new ImportService({
    uploadRepository,
    imageStorage: new S3ImageStore(s3Config),
    notifier,
    providerState,
    toolReasoning,
    stepExecutor,
    logger: console
  });

  return {
    importService,
    exportService,
    sendNotificationService,
    providerService: providerState,
    runHealthChecks: createHealthRunner(realtimeDb, env.LLM_BASE_URL, env.LLM_API_KEY, s3Config),
    logger: console
  };
}
