import type { LlmProvider } from "../configs/env.config";

export type LiteLlmClientOptions = {
  baseUrl: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
};

export type LiteLlmModelsResponse = {
  data?: Array<{ id?: unknown }>;
};

export type ProviderState = {
  current_provide: LlmProvider;
};

export interface ProviderStateRepository {
  getProviderState(): Promise<ProviderState | null>;
  setProviderState(state: ProviderState): Promise<void>;
}
