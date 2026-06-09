import { AIREYE_API_KEY, API_KEY_HEADER, createApp } from "../src/app";
import type {
  ImportServiceDependencies,
  AutoAnalyseService,
  Logger,
  ProviderService,
  SendNotificationService
} from "../src/api/v1/model/services.model";
import type { HealthReport } from "../src/api/v1/model/health.model";
import type { ImportService } from "../src/api/v1/model/services.model";
import { ExportService } from "../src/api/v1/services/export.service";
import { AutoAnalyseService as AutoAnalyseServiceImpl } from "../src/api/v1/services/auto-analyse.service";
import { ImportService as ImportServiceImpl } from "../src/api/v1/services/import.service";
import { invalidProvider } from "../src/libs/utils/api-error.util";
import { InMemoryUploadRepository } from "./in-memory-upload-repository";
import type { LlmProvider } from "../src/libs/configs/env.config";

export const silentLogger: Logger = {
  error: () => {},
  warn: () => {},
  info: () => {}
};

export { AIREYE_API_KEY, API_KEY_HEADER };

export function stableOkHealth(): HealthReport {
  return {
    version: "0.0.0-test",
    ok: true,
    firebase: { ok: true, latencyMs: 0 },
    llm: { ok: true, latencyMs: 0 },
    s3: { ok: true, latencyMs: 0 }
  };
}

export function stableDegradedHealth(overrides: Partial<Omit<HealthReport, "ok">>): HealthReport {
  return {
    ...stableOkHealth(),
    ...overrides,
    ok: false
  };
}

export type BuildTestAppInput = {
  importService?: ImportService;
  exportService?: ExportService;
  sendNotificationService?: SendNotificationService;
  providerService?: ProviderService;
  autoAnalyseService?: AutoAnalyseService;
  providerCurrent?: LlmProvider;
  providerAvailable?: LlmProvider[];
  runHealthChecks?: () => Promise<HealthReport>;
  logger?: Logger;
};

const noopImportService: ImportService = {
  queueImport: async () => {
    throw new Error("Import not configured in this test shell");
  },
  queueRegenerate: async () => {
    throw new Error("Regenerate not configured in this test shell");
  }
};

const noopSendNotificationService: SendNotificationService = {
  sendNotification: async () => {}
};

export function createInMemoryAutoAnalyseFlagRepository(initial: boolean | null = null) {
  let autoAnalyse = initial;
  return {
    getAutoAnalyseEnabled: async () => autoAnalyse,
    setAutoAnalyseEnabled: async (next: boolean) => {
      autoAnalyse = next;
    }
  };
}

const inMemoryProviderService = (
  currentProvider: LlmProvider,
  availableProviders: LlmProvider[]
): ProviderService => {
  let current_provide = currentProvider;
  const available_providers = [...availableProviders];
  return {
    getSnapshot: async () => ({
      current_provide,
      available_providers
    }),
    setCurrentProvider: async (provider) => {
      if (!available_providers.includes(provider)) {
        throw invalidProvider(`Provider is not configured: ${provider}`);
      }
      current_provide = provider;
      return { current_provide };
    }
  };
};

export function buildTestApp(input: BuildTestAppInput = {}) {
  const importService = input.importService ?? noopImportService;
  const exportService = input.exportService ?? new ExportService(new InMemoryUploadRepository());
  const sendNotificationService = input.sendNotificationService ?? noopSendNotificationService;
  const providerCurrent = input.providerCurrent ?? input.providerAvailable?.[0] ?? "test-provider";
  const providerService =
    input.providerService ??
    inMemoryProviderService(providerCurrent, input.providerAvailable ?? [providerCurrent]);
  const autoAnalyseService =
    input.autoAnalyseService ??
    new AutoAnalyseServiceImpl(createInMemoryAutoAnalyseFlagRepository());
  const runHealthChecks = input.runHealthChecks ?? (async () => stableOkHealth());
  return createApp({
    importService,
    exportService,
    sendNotificationService,
    providerService,
    autoAnalyseService,
    runHealthChecks,
    logger: input.logger ?? silentLogger
  });
}

/** Real {@link ImportServiceImpl} with stubbed pipeline deps and no vendor I/O. */
export function createImportServiceWithStubbedPipeline(
  deps?: Partial<ImportServiceDependencies>,
  overrides: { provider?: LlmProvider; extractedText?: string; finalText?: string } = {}
) {
  const uploadRepository = deps?.uploadRepository ?? new InMemoryUploadRepository();
  const imageStorage =
    deps?.imageStorage ??
    {
      uploadImage: async (_imageBuffer: Buffer, publicId: string, imageMimeType: string) => ({
        imageUrl: `https://storage.example.test/${publicId}`,
        bucket: "testing",
        objectKey: `uploads/${publicId}.${imageMimeType === "image/png" ? "png" : "jpg"}`
      })
    };
  const provider = overrides.provider ?? "test-provider";
  const extractedText = overrides.extractedText ?? "extracted";
  const finalText = overrides.finalText ?? `reasoned:${extractedText}`;
  return new ImportServiceImpl({
    uploadRepository,
    imageStorage,
    notifier:
      deps?.notifier ??
      {
        broadcastCaptureRequest: async () => {},
        broadcastExportRefresh: async () => {}
      },
    autoAnalyseFlagRepository:
      deps?.autoAnalyseFlagRepository ?? createInMemoryAutoAnalyseFlagRepository(),
    providerState: deps?.providerState ?? { getCurrentProvider: async () => provider },
    workflowRunner:
      deps?.workflowRunner ?? { run: async () => ({ extractedText, finalText }) },
    logger: deps?.logger ?? silentLogger,
    now: deps?.now ?? (() => 4242),
    generateUploadId: deps?.generateUploadId ?? (() => "integration_upload_id")
  });
}
