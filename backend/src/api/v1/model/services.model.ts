import type {
  AirEyeUpload,
  AirEyeUploadRow,
  ImportRequest,
  ImportStreamSseData
} from "./import.model";
import type { RegenerateRequest } from "./regenerate.model";
import type { LlmProvider } from "../../../libs/configs/env.config";
import type { ProviderStateService } from "../../../libs/litellm/provider-state";
import type { ToolReasoning } from "../../../libs/workflow/tool-reasoning";
import type { StepExecutor } from "../../../libs/workflow/step-executor";

export type UploadedImage = {
  imageUrl: string;
  bucket: string;
  objectKey: string;
};

export interface UploadRepository {
  createPendingUpload(id: string, upload: AirEyeUpload): Promise<void>;
  updateUpload(id: string, updates: Partial<AirEyeUpload>): Promise<void>;
  getUpload(id: string): Promise<AirEyeUploadRow | null>;
  listUploads(limit: number): Promise<AirEyeUploadRow[]>;
}

export interface ImageStorage {
  uploadImage(
    imageBuffer: Buffer,
    publicId: string,
    imageMimeType: string
  ): Promise<UploadedImage | null>;
}

export interface ResultNotifier {
  broadcastCaptureRequest(): Promise<void>;
  broadcastExportRefresh(): Promise<void>;
}

export type Logger = Pick<Console, "error" | "warn" | "info">;

export type ImportServiceDependencies = {
  uploadRepository: UploadRepository;
  imageStorage: ImageStorage;
  notifier: ResultNotifier;
  autoAnalyseFlagRepository: AutoAnalyseFlagRepository;
  providerState: Pick<ProviderStateService, "getCurrentProvider">;
  toolReasoning: Pick<ToolReasoning, "decideSteps">;
  stepExecutor: Pick<StepExecutor, "run">;
  logger?: Logger;
  now?: () => number;
  generateUploadId?: () => string;
};

export type ImportStreamEmitter = (data: ImportStreamSseData) => void;

export interface ImportService {
  streamImport(request: ImportRequest, emit: ImportStreamEmitter): Promise<void>;
  streamRegenerate(request: RegenerateRequest, emit: ImportStreamEmitter): Promise<void>;
}

export interface SendNotificationService {
  sendNotification(): Promise<void>;
}

export interface AutoAnalyseFlagRepository {
  getAutoAnalyseEnabled(): Promise<boolean | null>;
  setAutoAnalyseEnabled(autoAnalyse: boolean): Promise<void>;
}

export interface AutoAnalyseService {
  getAutoAnalyseEnabled(): Promise<boolean>;
  setAutoAnalyseEnabled(autoAnalyse: boolean): Promise<{ auto_analyse: boolean }>;
}

export interface ProviderService {
  getSnapshot(): Promise<{
    current_provide: LlmProvider;
    available_providers: LlmProvider[];
  }>;
  setCurrentProvider(provider: LlmProvider): Promise<{
    current_provide: LlmProvider;
  }>;
}
