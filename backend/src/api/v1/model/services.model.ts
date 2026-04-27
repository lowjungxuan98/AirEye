import type { GrimUpload, GrimUploadRow, ImportRequest, ImportStreamSseData } from "./import.model";
import type { LlmProvider } from "../../../libs/configs/env.config";

export type UploadedImage = {
  imageUrl: string;
  bucket: string;
  objectKey: string;
};

export interface UploadRepository {
  createPendingUpload(id: string, upload: GrimUpload): Promise<void>;
  updateUpload(id: string, updates: Partial<GrimUpload>): Promise<void>;
  getUpload(id: string): Promise<GrimUploadRow | null>;
  listUploads(limit: number): Promise<GrimUploadRow[]>;
}

export interface ImageTextExtractor {
  extractTextFromImage(imageBuffer: Buffer, imageMimeType: string): Promise<string>;
}

export interface FinalTextBuilder {
  buildFinalText(extractedText: string): Promise<string>;
}

export interface FinalTextFormatGuard {
  guardFinalText(finalText: string): Promise<string>;
}

export interface ImageStorage {
  uploadImage(
    imageBuffer: Buffer,
    publicId: string,
    imageMimeType: string
  ): Promise<UploadedImage>;
}

export interface ResultNotifier {
  broadcastCaptureRequest(): Promise<void>;
  broadcastExportRefresh(): Promise<void>;
}

export type Logger = Pick<Console, "error" | "warn" | "info">;

export type ImportServiceDependencies = {
  uploadRepository: UploadRepository;
  textExtractor: ImageTextExtractor;
  finalTextBuilder: FinalTextBuilder;
  finalTextFormatGuard: FinalTextFormatGuard;
  imageStorage: ImageStorage;
  notifier: ResultNotifier;
  logger?: Logger;
  now?: () => number;
  generateUploadId?: () => string;
};

export type ImportStreamEmitter = (data: ImportStreamSseData) => void;

export interface ImportService {
  streamImport(request: ImportRequest, emit: ImportStreamEmitter): Promise<void>;
}

export interface CaptureService {
  sendCaptureNotification(): Promise<void>;
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
