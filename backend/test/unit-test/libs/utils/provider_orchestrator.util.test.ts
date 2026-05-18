import { describe, expect, it } from "vitest";
import type { OpenAICompatibleChatClient } from "../../../../src/libs/llm/text-processor";
import { ProviderOrchestrator, type ProviderStateRepository } from "../../../../src/libs/utils/provider_orchestrator.util";

function createRepository(initialProvider?: string): ProviderStateRepository {
  let currentProvider = initialProvider;
  return {
    getProviderState: async () =>
      currentProvider ? { current_provide: currentProvider } : null,
    setProviderState: async (state) => {
      currentProvider = state.current_provide;
    }
  };
}

function createOrchestrator(input: {
  providers: string[];
  defaultProvider?: string;
  initialProvider?: string;
  client?: OpenAICompatibleChatClient;
  onLoadAvailableProviders?: () => void;
}) {
  const client =
    input.client ??
    ({
      chat: {
        completions: {
          create: async () => ({ choices: [] })
        }
      }
    } satisfies OpenAICompatibleChatClient);

  return new ProviderOrchestrator({
    client,
    getAvailableProviders: async () => {
      input.onLoadAvailableProviders?.();
      return input.providers;
    },
    defaultProvider: input.defaultProvider ?? "nvidia",
    stateRepository: createRepository(input.initialProvider),
    getExtractPromptText: () => "extract",
    getAnalyzingSystemPrompt: () => "analyze",
    getFormatGuardSystemPrompt: () => "guard"
  });
}

describe("ProviderOrchestrator provider selection", () => {
  it("uses the configured default provider when it is available", async () => {
    const orchestrator = createOrchestrator({
      providers: ["openai", "nvidia"],
      defaultProvider: "nvidia"
    });

    await expect(orchestrator.getSnapshot()).resolves.toEqual({
      current_provide: "nvidia",
      available_providers: ["openai", "nvidia"]
    });
  });

  it("falls back to the first discovered provider when the default is unavailable", async () => {
    const orchestrator = createOrchestrator({
      providers: ["openai", "openrouter"],
      defaultProvider: "nvidia"
    });

    await expect(orchestrator.getCurrentProvider()).resolves.toBe("openai");
  });

  it("uses stored provider state without loading available providers for pipeline calls", async () => {
    let providerLoads = 0;
    const orchestrator = createOrchestrator({
      providers: [],
      initialProvider: "stored-provider",
      onLoadAvailableProviders: () => {
        providerLoads += 1;
      }
    });

    await expect(orchestrator.getCurrentProvider()).resolves.toBe("stored-provider");
    expect(providerLoads).toBe(0);
  });

  it("rejects providers that are not discovered from LiteLLM", async () => {
    const orchestrator = createOrchestrator({ providers: ["openai"] });

    await expect(orchestrator.setCurrentProvider("deepseek")).rejects.toMatchObject({
      statusCode: 400,
      code: "INVALID_PROVIDER"
    });
  });

  it("uses the selected provider for image-stage model names", async () => {
    let requestedModel = "";
    const client = {
      chat: {
        completions: {
          create: async (input: { model: string }) => {
            requestedModel = input.model;
            return { choices: [{ message: { content: "ok" } }] };
          }
        }
      }
    };
    const orchestrator = createOrchestrator({
      providers: ["deepseek"],
      initialProvider: "deepseek",
      client
    });

    await expect(orchestrator.extractTextFromImageUrl("https://example.test/image.png")).resolves.toBe("ok");
    expect(requestedModel).toBe("deepseek-image");
  });
});
