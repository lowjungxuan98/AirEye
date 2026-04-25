import type {
  FinalTextBuilder,
  FinalTextFormatGuard,
  ImageTextExtractor
} from "../../api/v1/model/services.model";
import type { LlmConfig, LlmProvider } from "../configs/env.config";
import { ApiError } from "./api-error.util";
import { OpenAICompatibleTextProcessor } from "../llm/text-processor";

export const LLM_PROVIDERS = ["openrouter", "openai", "nvidia_nim"] as const;

export type ProviderState = {
  current_provide: LlmProvider;
};

export interface ProviderStateRepository {
  getProviderState(): Promise<ProviderState | null>;
  setProviderState(state: ProviderState): Promise<void>;
}

type ProviderStageConfig = {
  extract: LlmConfig;
  final: LlmConfig;
};

export type ProviderOrchestratorOptions = {
  providers: Partial<Record<LlmProvider, ProviderStageConfig>>;
  defaultProvider: LlmProvider;
  stateRepository: ProviderStateRepository;
  getExtractPromptText: () => string;
  getAnalyzingSystemPrompt: () => string;
  getFormatGuardSystemPrompt: () => string;
};

export class ProviderOrchestrator implements ImageTextExtractor, FinalTextBuilder, FinalTextFormatGuard {
  private readonly processors = new Map<
    LlmProvider,
    {
      extract: OpenAICompatibleTextProcessor;
      final: OpenAICompatibleTextProcessor;
    }
  >();
  private readonly defaultProvider: LlmProvider;
  private readonly stateRepository: ProviderStateRepository;

  constructor(options: ProviderOrchestratorOptions) {
    this.defaultProvider = options.defaultProvider;
    this.stateRepository = options.stateRepository;

    for (const provider of LLM_PROVIDERS) {
      const config = options.providers[provider];
      if (!config) {
        continue;
      }
      this.processors.set(provider, {
        extract: new OpenAICompatibleTextProcessor({
          apiKey: config.extract.apiKey,
          model: config.extract.model,
          baseURL: config.extract.baseURL,
          getExtractPromptText: options.getExtractPromptText,
          getAnalyzingSystemPrompt: options.getAnalyzingSystemPrompt,
          getFormatGuardSystemPrompt: options.getFormatGuardSystemPrompt
        }),
        final: new OpenAICompatibleTextProcessor({
          apiKey: config.final.apiKey,
          model: config.final.model,
          baseURL: config.final.baseURL,
          getExtractPromptText: options.getExtractPromptText,
          getAnalyzingSystemPrompt: options.getAnalyzingSystemPrompt,
          getFormatGuardSystemPrompt: options.getFormatGuardSystemPrompt,
          enableWebSearchInAnalyze: provider === "openai"
        })
      });
    }

    if (!this.processors.has(this.defaultProvider)) {
      throw new Error(`Default LLM provider is not configured: ${this.defaultProvider}`);
    }
  }

  getAvailableProviders(): LlmProvider[] {
    return LLM_PROVIDERS.filter((provider) => this.processors.has(provider));
  }

  async getCurrentProvider(): Promise<LlmProvider> {
    const state = await this.stateRepository.getProviderState();
    if (!state) {
      await this.setCurrentProvider(this.defaultProvider);
      return this.defaultProvider;
    }
    if (!this.processors.has(state.current_provide)) {
      throw new ApiError(
        503,
        "PROVIDER_NOT_CONFIGURED",
        `Current provider is not configured: ${state.current_provide}`
      );
    }
    return state.current_provide;
  }

  async setCurrentProvider(provider: LlmProvider): Promise<ProviderState> {
    if (!this.processors.has(provider)) {
      throw new ApiError(400, "INVALID_PROVIDER", `Provider is not configured: ${provider}`);
    }
    const state = { current_provide: provider };
    await this.stateRepository.setProviderState(state);
    return state;
  }

  async getSnapshot(): Promise<ProviderState & { available_providers: LlmProvider[] }> {
    return {
      current_provide: await this.getCurrentProvider(),
      available_providers: this.getAvailableProviders()
    };
  }

  async extractTextFromImage(imageBuffer: Buffer, imageMimeType: string): Promise<string> {
    const provider = await this.getCurrentProvider();
    return this.requireProcessor(provider).extract.extractTextFromImage(imageBuffer, imageMimeType);
  }

  async buildFinalText(extractedText: string): Promise<string> {
    const provider = await this.getCurrentProvider();
    return this.requireProcessor(provider).final.buildFinalText(extractedText);
  }

  async guardFinalText(finalText: string): Promise<string> {
    const provider = await this.getCurrentProvider();
    return this.requireProcessor(provider).final.guardFinalText(finalText);
  }

  private requireProcessor(provider: LlmProvider) {
    const processor = this.processors.get(provider);
    if (!processor) {
      throw new ApiError(503, "PROVIDER_NOT_CONFIGURED", `Provider is not configured: ${provider}`);
    }
    return processor;
  }
}

export function parseProvider(value: unknown): LlmProvider | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "openrouter" || normalized === "openai") {
    return normalized;
  }
  if (normalized === "nvidia_nim" || normalized === "nim") {
    return "nvidia_nim";
  }
  return null;
}
