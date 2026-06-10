import type { AppDependencies } from "./app";
import { createHealthRunner } from "./api/v1/services/health.service";
import { SendNotificationService } from "./api/v1/services/send-notification.service";
import { ExportService } from "./api/v1/services/export.service";
import { ImportService } from "./api/v1/services/import.service";
import { AutoAnalyseService } from "./api/v1/services/auto-analyse.service";
import type { ServerEnv } from "./libs/configs/env.config";
import { S3ImageStore } from "./libs/s3/client";
import type { S3Config } from "./libs/s3/type";
import { DEFAULT_FCM_BROADCAST_TOPIC, FirebaseNotifier } from "./libs/firebase/export";
import { getFirebaseAdminApp } from "./libs/firebase/admin";
import {
  FirebaseProviderStateRepository,
  FirebaseAutoAnalyseFlagRepository,
  FirebaseUploadRepository,
  getRealtimeDb,
  type RealtimeNamespace
} from "./libs/firebase/realtime";
import { resolveFcmBroadcastTopic, resolveS3Bucket } from "./libs/configs/env.config";
import { LiteLlmClient } from "./libs/litellm/client";
import { ProviderStateService } from "./libs/litellm/provider-state";
import { AgentWorkflowClient } from "./libs/agent/client";
import { BullMqImportWorkflowQueue } from "./api/v1/services/import-workflow.queue";

export function createProductionDependencies(env: ServerEnv): AppDependencies {
  const firebaseApp = getFirebaseAdminApp(env);
  const realtimeDb = getRealtimeDb(firebaseApp);
  const namespace: RealtimeNamespace =
    (process.env.NODE_ENV ?? "development").trim().toLowerCase() === "production"
      ? "production"
      : "development";
  const uploadRepository = new FirebaseUploadRepository(realtimeDb, namespace);
  const providerStateRepository = new FirebaseProviderStateRepository(realtimeDb, namespace);
  const autoAnalyseFlagRepository = new FirebaseAutoAnalyseFlagRepository(realtimeDb, namespace);
  const exportService = new ExportService(uploadRepository);
  const autoAnalyseService = new AutoAnalyseService(autoAnalyseFlagRepository);
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

  const litellm = new LiteLlmClient({ baseUrl: env.LLM_BASE_URL, apiKey: env.LLM_API_KEY });
  const providerState = new ProviderStateService({
    litellm,
    stateRepository: providerStateRepository
  });
  const workflowRunner = new AgentWorkflowClient({
    baseUrl: env.GENAI_BASE_URL,
    apiKey: env.GENAI_API_KEY
  });

  const importService = new ImportService({
    uploadRepository,
    imageStorage: new S3ImageStore(s3Config),
    notifier,
    autoAnalyseFlagRepository,
    providerState,
    workflowRunner,
    logger: console,
    workflowQueueFactory: (processor) =>
      new BullMqImportWorkflowQueue({
        redisUrl: env.REDIS_URL,
        processor,
        logger: console
      })
  });

  return {
    apiKey: env.AIREYE_API_KEY,
    importService,
    exportService,
    sendNotificationService,
    providerService: providerState,
    autoAnalyseService,
    runHealthChecks: createHealthRunner(realtimeDb, env.LLM_BASE_URL, env.LLM_API_KEY, s3Config),
    logger: console
  };
}
