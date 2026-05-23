import { invalidProvider, providerNotConfigured } from "../utils/api-error.util";
import { parseLlmProvider, type LlmProvider } from "../configs/env.config";
import type { LiteLlmClient } from "./client";

export type ProviderState = {
  current_provide: LlmProvider;
};

export interface ProviderStateRepository {
  getProviderState(): Promise<ProviderState | null>;
  setProviderState(state: ProviderState): Promise<void>;
}

export type ProviderStateServiceOptions = {
  litellm: Pick<LiteLlmClient, "getAvailableProviders">;
  stateRepository: ProviderStateRepository;
};

export class ProviderStateService {
  private readonly litellm: Pick<LiteLlmClient, "getAvailableProviders">;
  private readonly stateRepository: ProviderStateRepository;

  constructor(options: ProviderStateServiceOptions) {
    this.litellm = options.litellm;
    this.stateRepository = options.stateRepository;
  }

  async getAvailableProviders(): Promise<LlmProvider[]> {
    return this.litellm.getAvailableProviders();
  }

  async getCurrentProvider(): Promise<LlmProvider> {
    const state = await this.stateRepository.getProviderState();
    if (state) {
      return parseLlmProvider(state.current_provide);
    }
    return this.resolveCurrentProvider(await this.getAvailableProviders());
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

  private async resolveCurrentProvider(availableProviders: LlmProvider[]): Promise<LlmProvider> {
    const state = await this.stateRepository.getProviderState();
    if (!state) {
      const provider = availableProviders[0];
      if (!provider) {
        throw providerNotConfigured("no LiteLLM providers discovered");
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
