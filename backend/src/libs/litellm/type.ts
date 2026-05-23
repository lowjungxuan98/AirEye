import type { LlmProvider } from "../configs/env.config";

export type OpenAICompatibleMessage =
  | { role: "system"; content: string }
  | {
      role: "user";
      content:
        | string
        | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;
    };

export type OpenAICompatibleChatResponse = {
  choices?: Array<{
    message?: { content?: unknown };
  }>;
};

export type OpenAICompatibleChatClient = {
  chat: {
    completions: {
      create(input: {
        model: string;
        messages: OpenAICompatibleMessage[];
        max_tokens: number;
        temperature: number;
        /**
         * LiteLLM passthrough for provider-specific parameters (e.g.
         * `{ thinking: { type: "disabled" } }` for ZhipuAI GLM models).
         */
        extra_body?: Record<string, unknown>;
      }): Promise<OpenAICompatibleChatResponse>;
    };
  };
};

export type LiteLlmClientOptions = {
  baseUrl: string;
  apiKey: string;
  /** Inject a pre-built OpenAI-compatible client (for tests). */
  chatClient?: OpenAICompatibleChatClient;
  /** Override `fetch` for `/models` discovery (for tests). */
  fetchImpl?: typeof fetch;
};

export type RunStepInput = {
  provider: LlmProvider;
  prompt: string;
};

export type RunVisionStepInput = RunStepInput & {
  imageUrl: string;
};

export type RunReasoningStepInput = RunStepInput & {
  input: string;
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
