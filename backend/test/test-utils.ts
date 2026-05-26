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
import type { WorkflowStep } from "../src/libs/workflow/type";

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
  streamImport: async (_request, emit) => {
    emit({ error: { code: "INTERNAL_ERROR", message: "Import not configured in this test shell" } });
  },
  streamRegenerate: async (_request, emit) => {
    emit({ error: { code: "INTERNAL_ERROR", message: "Regenerate not configured in this test shell" } });
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

export type StubbedPipelineOverrides = {
  steps?: WorkflowStep[];
  /** Output returned by every vision step (or per-call overrides keyed by prompt name). */
  visionOutput?: string | ((prompt: string) => string);
  reasoningOutput?: string | ((prompt: string, input: string) => string);
  provider?: LlmProvider;
};

/** Real {@link ImportServiceImpl} with stubbed pipeline deps and no vendor I/O. */
export function createImportServiceWithStubbedPipeline(
  deps?: Partial<ImportServiceDependencies>,
  overrides: StubbedPipelineOverrides = {}
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
  const defaultSteps: WorkflowStep[] = overrides.steps ?? [
    { prompt: "vision-prompt", model: "image" },
    { prompt: "reasoning-prompt", model: "reasoning" }
  ];
  const providerState = deps?.providerState ?? {
    getCurrentProvider: async () => provider
  };
  const toolReasoning = deps?.toolReasoning ?? {
    decideSteps: async () => defaultSteps
  };
  const visionOutputFn =
    typeof overrides.visionOutput === "function"
      ? overrides.visionOutput
      : (_prompt: string) =>
          typeof overrides.visionOutput === "string" ? overrides.visionOutput : "extracted";
  const reasoningOutputFn =
    typeof overrides.reasoningOutput === "function"
      ? overrides.reasoningOutput
      : (_prompt: string, input: string) =>
          typeof overrides.reasoningOutput === "string"
            ? overrides.reasoningOutput
            : `reasoned:${input}`;
  const stepExecutor =
    deps?.stepExecutor ??
    {
      run: async ({ steps, imageUrl, onStepStart, onStepEnd }) => {
        const outputs: string[] = [];
        for (let i = 0; i < steps.length; i += 1) {
          const step = steps[i]!;
          onStepStart?.(i, step);
          const output =
            step.model === "image"
              ? visionOutputFn(step.prompt)
              : reasoningOutputFn(step.prompt, outputs[i - 1] ?? imageUrl);
          outputs.push(output);
          onStepEnd?.(i, output);
        }
        return outputs;
      }
    };
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
    providerState,
    toolReasoning,
    stepExecutor,
    logger: deps?.logger ?? silentLogger,
    now: deps?.now ?? (() => 4242),
    generateUploadId: deps?.generateUploadId ?? (() => "integration_upload_id")
  });
}
