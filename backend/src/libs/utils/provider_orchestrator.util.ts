import type {
  FinalTextBuilder,
  FinalTextFormatGuard,
  ImageTextExtractor
} from "../../api/v1/model/services.model";
import type { LlmProvider } from "../configs/env.config";
import { parseLlmProvider } from "../configs/env.config";
import { invalidProvider, providerNotConfigured } from "./api-error.util";
import {
  OpenAICompatibleTextProcessor,
  type OpenAICompatibleChatClient
} from "../llm/text-processor";

export type ProviderState = {
  current_provide: LlmProvider;
};

export interface ProviderStateRepository {
  getProviderState(): Promise<ProviderState | null>;
  setProviderState(state: ProviderState): Promise<void>;
}

export type ProviderOrchestratorOptions = {
  client: OpenAICompatibleChatClient;
  getAvailableProviders: () => Promise<LlmProvider[]>;
  defaultProvider: LlmProvider;
  stateRepository: ProviderStateRepository;
  getExtractPromptText: () => string;
  getAnalyzingSystemPrompt: () => string;
  getFormatGuardSystemPrompt: () => string;
};

export class ProviderOrchestrator implements ImageTextExtractor, FinalTextBuilder, FinalTextFormatGuard {
  private readonly client: OpenAICompatibleChatClient;
  private readonly loadAvailableProviders: () => Promise<LlmProvider[]>;
  private readonly defaultProvider: LlmProvider;
  private readonly stateRepository: ProviderStateRepository;
  private readonly getExtractPromptText: () => string;
  private readonly getAnalyzingSystemPrompt: () => string;
  private readonly getFormatGuardSystemPrompt: () => string;

  constructor(options: ProviderOrchestratorOptions) {
    this.client = options.client;
    this.loadAvailableProviders = options.getAvailableProviders;
    this.defaultProvider = options.defaultProvider;
    this.stateRepository = options.stateRepository;
    this.getExtractPromptText = options.getExtractPromptText;
    this.getAnalyzingSystemPrompt = options.getAnalyzingSystemPrompt;
    this.getFormatGuardSystemPrompt = options.getFormatGuardSystemPrompt;
  }

  async getAvailableProviders(): Promise<LlmProvider[]> {
    return this.loadAvailableProviders();
  }

  async getCurrentProvider(): Promise<LlmProvider> {
    const state = await this.stateRepository.getProviderState();
    if (state) {
      return parseLlmProvider(state.current_provide);
    }
    return this.resolveCurrentProvider(await this.getAvailableProviders());
  }

  private async resolveCurrentProvider(availableProviders: LlmProvider[]): Promise<LlmProvider> {
    const state = await this.stateRepository.getProviderState();
    if (!state) {
      const provider = availableProviders.includes(this.defaultProvider)
        ? this.defaultProvider
        : availableProviders[0];
      if (!provider) {
        throw providerNotConfigured(this.defaultProvider);
      }
      await this.stateRepository.setProviderState({ current_provide: provider });
      return provider;
    }
    const currentProvider = parseLlmProvider(state.current_provide);
    if (!availableProviders.includes(currentProvider)) {
      throw providerNotConfigured(currentProvider);
    }
    return currentProvider;
  }

  async setCurrentProvider(provider: LlmProvider): Promise<ProviderState> {
    const normalizedProvider = parseLlmProvider(provider);
    const availableProviders = await this.getAvailableProviders();
    if (!availableProviders.includes(normalizedProvider)) {
      throw invalidProvider(`Provider is not configured: ${provider}`);
    }
    const state = { current_provide: normalizedProvider };
    await this.stateRepository.setProviderState(state);
    return state;
  }

  async getSnapshot(): Promise<ProviderState & { available_providers: LlmProvider[] }> {
    const availableProviders = await this.getAvailableProviders();
    return {
      current_provide: await this.resolveCurrentProvider(availableProviders),
      available_providers: availableProviders
    };
  }

  async extractTextFromImage(imageBuffer: Buffer, imageMimeType: string): Promise<string> {
    const provider = await this.getCurrentProvider();
    return this.processor(provider, "image").extractTextFromImage(imageBuffer, imageMimeType);
  }

  async extractTextFromImageUrl(imageUrl: string): Promise<string> {
    const provider = await this.getCurrentProvider();
    return this.processor(provider, "image").extractTextFromImageUrl(imageUrl);
  }

  async buildFinalText(extractedText: string): Promise<string> {
    const provider = await this.getCurrentProvider();
    return this.processor(provider, "reasoning").buildFinalText(extractedText);
  }

  async guardFinalText(finalText: string): Promise<string> {
    const provider = await this.getCurrentProvider();
    return this.processor(provider, "reasoning").guardFinalText(finalText);
  }

  private processor(provider: LlmProvider, stage: "image" | "reasoning"): OpenAICompatibleTextProcessor {
    return new OpenAICompatibleTextProcessor({
      model: `${provider}-${stage}`,
      client: this.client,
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
