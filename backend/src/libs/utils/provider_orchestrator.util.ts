import type {
  FinalTextBuilder,
  FinalTextFormatGuard,
  ImageTextExtractor
} from "../../api/v1/model/services.model";
import type { LlmProvider } from "../configs/env.config";
import { parseLlmProvider } from "../configs/env.config";
import { ApiError } from "./api-error.util";
import { OpenAICompatibleTextProcessor } from "../llm/text-processor";
import type OpenAI from "openai";

export const LLM_PROVIDERS = ["openrouter", "openai", "nvidia", "deepseek"] as const;

export type ProviderState = {
  current_provide: LlmProvider;
};

export interface ProviderStateRepository {
  getProviderState(): Promise<ProviderState | null>;
  setProviderState(state: ProviderState): Promise<void>;
}

export type ProviderOrchestratorOptions = {
  client: OpenAI;
  availableProviders: LlmProvider[];
  defaultProvider: LlmProvider;
  stateRepository: ProviderStateRepository;
  getExtractPromptText: () => string;
  getAnalyzingSystemPrompt: () => string;
  getFormatGuardSystemPrompt: () => string;
};

export class ProviderOrchestrator implements ImageTextExtractor, FinalTextBuilder, FinalTextFormatGuard {
  private readonly client: OpenAI;
  private readonly availableProviders: LlmProvider[];
  private readonly defaultProvider: LlmProvider;
  private readonly stateRepository: ProviderStateRepository;
  private readonly getExtractPromptText: () => string;
  private readonly getAnalyzingSystemPrompt: () => string;
  private readonly getFormatGuardSystemPrompt: () => string;

  constructor(options: ProviderOrchestratorOptions) {
    this.client = options.client;
    this.availableProviders = options.availableProviders;
    this.defaultProvider = options.defaultProvider;
    this.stateRepository = options.stateRepository;
    this.getExtractPromptText = options.getExtractPromptText;
    this.getAnalyzingSystemPrompt = options.getAnalyzingSystemPrompt;
    this.getFormatGuardSystemPrompt = options.getFormatGuardSystemPrompt;
  }

  getAvailableProviders(): LlmProvider[] {
    return this.availableProviders;
  }

  async getCurrentProvider(): Promise<LlmProvider> {
    const state = await this.stateRepository.getProviderState();
    if (!state) {
      await this.setCurrentProvider(this.defaultProvider);
      return this.defaultProvider;
    }
    if (!this.availableProviders.includes(state.current_provide)) {
      throw new ApiError(
        503,
        "PROVIDER_NOT_CONFIGURED",
        `Current provider is not configured: ${state.current_provide}`
      );
    }
    return state.current_provide;
  }

  async setCurrentProvider(provider: LlmProvider): Promise<ProviderState> {
    if (!this.availableProviders.includes(provider)) {
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
    return this.processor(this.imageProvider(provider), "image").extractTextFromImage(imageBuffer, imageMimeType);
  }

  async extractTextFromImageUrl(imageUrl: string): Promise<string> {
    const provider = await this.getCurrentProvider();
    return this.processor(this.imageProvider(provider), "image").extractTextFromImageUrl(imageUrl);
  }

  async buildFinalText(extractedText: string): Promise<string> {
    const provider = await this.getCurrentProvider();
    return this.processor(provider, "reasoning").buildFinalText(extractedText);
  }

  async guardFinalText(finalText: string): Promise<string> {
    const provider = await this.getCurrentProvider();
    return this.processor(provider, "reasoning").guardFinalText(finalText);
  }

  /** DeepSeek has no vision API — fall back to OpenAI for image extraction. */
  private imageProvider(provider: LlmProvider): LlmProvider {
    return provider === "deepseek" ? "openai" : provider;
  }

  private processor(provider: LlmProvider, stage: "image" | "reasoning"): OpenAICompatibleTextProcessor {
    return new OpenAICompatibleTextProcessor({
      apiKey: "",
      model: `${provider}-${stage}`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      client: this.client as any,
      getExtractPromptText: this.getExtractPromptText,
      getAnalyzingSystemPrompt: this.getAnalyzingSystemPrompt,
      getFormatGuardSystemPrompt: this.getFormatGuardSystemPrompt
    });
  }
}

export function parseProvider(value: unknown): LlmProvider | null {
  if (typeof value !== "string") {
    return null;
  }
  try {
    return parseLlmProvider(value);
  } catch {
    return null;
  }
}
