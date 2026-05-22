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
  initialProvider?: string;
  client?: OpenAICompatibleChatClient;
  onLoadAvailableProviders?: () => void;
  analyzePrompt?: string;
  mcqExtractPrompt?: string;
  mcqFinalPrompt?: string;
  taskExtractPrompt?: string;
  taskFinalPrompt?: string;
  formatGuardPrompt?: string;
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
    stateRepository: createRepository(input.initialProvider),
    getAnalyzeQuestionPrompt: () => input.analyzePrompt ?? "analyze",
    getMcqExtractTextPrompt: () => input.mcqExtractPrompt ?? "mcq-extract",
    getMcqFinalTextPrompt: () => input.mcqFinalPrompt ?? "mcq-final",
    getTaskExtractTextPrompt: () => input.taskExtractPrompt ?? "task-extract",
    getTaskFinalTextPrompt: () => input.taskFinalPrompt ?? "task-final",
    getFormatGuardPrompt: () => input.formatGuardPrompt ?? "guard"
  });
}

describe("ProviderOrchestrator provider selection", () => {
  it("uses the first LiteLLM-discovered provider when no provider state exists", async () => {
    const orchestrator = createOrchestrator({
      providers: ["openai", "nvidia"]
    });

    await expect(orchestrator.getSnapshot()).resolves.toEqual({
      current_provide: "openai",
      available_providers: ["openai", "nvidia"]
    });
  });

  it("rejects when LiteLLM exposes no complete providers", async () => {
    const orchestrator = createOrchestrator({ providers: [] });

    await expect(orchestrator.getCurrentProvider()).rejects.toMatchObject({
      statusCode: 503,
      code: "PROVIDER_NOT_CONFIGURED"
    });
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
});

describe("ProviderOrchestrator routing per question flow", () => {
  function trackingClient(
    reply: string,
    finishReason: string = "stop",
    extra: { reasoningContent?: string } = {}
  ) {
    const calls: Array<{ model: string; messages: unknown; max_tokens: number; temperature: number }> = [];
    const client: OpenAICompatibleChatClient = {
      chat: {
        completions: {
          create: async (input) => {
            calls.push({
              model: input.model,
              messages: input.messages,
              max_tokens: input.max_tokens,
              temperature: input.temperature
            });
            return {
              choices: [
                {
                  message: extra.reasoningContent
                    ? { content: reply, reasoning_content: extra.reasoningContent }
                    : { content: reply },
                  finish_reason: finishReason
                }
              ]
            };
          }
        }
      }
    };
    return { client, calls };
  }

  it("analyzeQuestionTypeFromImageUrl uses the image-stage model and the analyze prompt", async () => {
    const { client, calls } = trackingClient("MCQ-Single");
    const orchestrator = createOrchestrator({
      providers: ["deepseek"],
      initialProvider: "deepseek",
      client,
      analyzePrompt: "ANALYZE"
    });

    await expect(orchestrator.analyzeQuestionTypeFromImageUrl("https://x")).resolves.toBe("MCQ-Single");
    expect(calls[0]?.model).toBe("deepseek-image");
    expect(calls[0]?.max_tokens).toBe(8192);
    expect(calls[0]?.temperature).toBe(0);
    const userMsg = (calls[0]?.messages as Array<{ role: string; content: unknown }>)[0];
    expect(userMsg.role).toBe("user");
    expect(JSON.stringify(userMsg.content)).toContain("ANALYZE");
    expect(JSON.stringify(userMsg.content)).toContain("https://x");
  });

  it.each(["Task", "MCQ-Single", "MCQ-Multiple"] as const)(
    "analyzeQuestionTypeFromImageUrl accepts %s including surrounding whitespace and fences",
    async (code) => {
      const { client } = trackingClient("```text\n" + code + "\n```");
      const orchestrator = createOrchestrator({
        providers: ["deepseek"],
        initialProvider: "deepseek",
        client
      });

      await expect(orchestrator.analyzeQuestionTypeFromImageUrl("https://x")).resolves.toBe(code);
    }
  );

  it("analyzeQuestionTypeFromImageUrl rejects unsupported model replies with INVALID_PROVIDER", async () => {
    const { client } = trackingClient("yes");
    const orchestrator = createOrchestrator({
      providers: ["deepseek"],
      initialProvider: "deepseek",
      client
    });

    const rejected = await orchestrator
      .analyzeQuestionTypeFromImageUrl("https://x")
      .catch((error: Error) => error);
    expect(rejected).toMatchObject({ statusCode: 400, code: "INVALID_PROVIDER" });
    expect(rejected.message).toContain('raw="yes"');
    expect(rejected.message).toContain("provider=deepseek");
    expect(rejected.message).toContain("model=deepseek-image");
    expect(rejected.message).toContain("finish_reason=stop");
  });

  it("analyzeQuestionTypeFromImageUrl surfaces empty model replies and finish_reason in the error message", async () => {
    const { client } = trackingClient("", "length");
    const orchestrator = createOrchestrator({
      providers: ["deepseek"],
      initialProvider: "deepseek",
      client
    });

    const rejected = await orchestrator
      .analyzeQuestionTypeFromImageUrl("https://x")
      .catch((error: Error) => error);
    expect(rejected).toMatchObject({ code: "INVALID_PROVIDER" });
    expect(rejected.message).toContain('raw=""');
    expect(rejected.message).toContain("finish_reason=length");
    expect(rejected.message).toContain("provider=deepseek");
    expect(rejected.message).toContain("model=deepseek-image");
  });

  it("recovers question type from reasoning_content when content is empty (thinking-mode models)", async () => {
    const { client } = trackingClient("", "length", {
      reasoningContent: "The image shows checkboxes so this is MCQ-Multiple."
    });
    const orchestrator = createOrchestrator({
      providers: ["glm"],
      initialProvider: "glm",
      client
    });

    await expect(orchestrator.analyzeQuestionTypeFromImageUrl("https://x")).resolves.toBe(
      "MCQ-Multiple"
    );
  });

  it("surfaces reasoning_tail in the error when reasoning is present but no code is recoverable", async () => {
    const { client } = trackingClient("", "length", {
      reasoningContent: "Hmm, the image is too blurry to decide."
    });
    const orchestrator = createOrchestrator({
      providers: ["glm"],
      initialProvider: "glm",
      client
    });

    const rejected = await orchestrator
      .analyzeQuestionTypeFromImageUrl("https://x")
      .catch((error: Error) => error);
    expect(rejected).toMatchObject({ code: "INVALID_PROVIDER" });
    expect(rejected.message).toContain("reasoning_tail=");
    expect(rejected.message).toContain("too blurry");
  });

  it("extractTextFromImageUrl(url, 'MCQ') uses the MCQ extract prompt", async () => {
    const { client, calls } = trackingClient("extracted-mcq");
    const orchestrator = createOrchestrator({
      providers: ["deepseek"],
      initialProvider: "deepseek",
      client,
      mcqExtractPrompt: "MCQ-EXTRACT",
      taskExtractPrompt: "TASK-EXTRACT"
    });

    await orchestrator.extractTextFromImageUrl("https://i", "MCQ");
    expect(calls[0]?.model).toBe("deepseek-image");
    const userMsg = (calls[0]?.messages as Array<{ content: unknown }>)[0];
    expect(JSON.stringify(userMsg.content)).toContain("MCQ-EXTRACT");
    expect(JSON.stringify(userMsg.content)).not.toContain("TASK-EXTRACT");
  });

  it("extractTextFromImageUrl(url, 'Task') uses the Task extract prompt", async () => {
    const { client, calls } = trackingClient("extracted-task");
    const orchestrator = createOrchestrator({
      providers: ["deepseek"],
      initialProvider: "deepseek",
      client,
      mcqExtractPrompt: "MCQ-EXTRACT",
      taskExtractPrompt: "TASK-EXTRACT"
    });

    await orchestrator.extractTextFromImageUrl("https://i", "Task");
    expect(calls[0]?.model).toBe("deepseek-image");
    const userMsg = (calls[0]?.messages as Array<{ content: unknown }>)[0];
    expect(JSON.stringify(userMsg.content)).toContain("TASK-EXTRACT");
    expect(JSON.stringify(userMsg.content)).not.toContain("MCQ-EXTRACT");
  });

  it("buildFinalText routes MCQ and Task flows to the matching reasoning prompts", async () => {
    const { client, calls } = trackingClient("final");
    const orchestrator = createOrchestrator({
      providers: ["deepseek"],
      initialProvider: "deepseek",
      client,
      mcqFinalPrompt: "MCQ-FINAL",
      taskFinalPrompt: "TASK-FINAL"
    });

    await orchestrator.buildFinalText("extracted", "MCQ");
    await orchestrator.buildFinalText("extracted", "Task");

    expect(calls[0]?.model).toBe("deepseek-reasoning");
    expect((calls[0]?.messages as Array<{ role: string; content: string }>)[0].content).toBe("MCQ-FINAL");
    expect((calls[1]?.messages as Array<{ role: string; content: string }>)[0].content).toBe("TASK-FINAL");
  });

  it("guardFinalText uses the reasoning model and the format guard prompt", async () => {
    const { client, calls } = trackingClient("guarded");
    const orchestrator = createOrchestrator({
      providers: ["deepseek"],
      initialProvider: "deepseek",
      client,
      formatGuardPrompt: "GUARD"
    });

    await orchestrator.guardFinalText("final");
    expect(calls[0]?.model).toBe("deepseek-reasoning");
    expect((calls[0]?.messages as Array<{ role: string; content: string }>)[0].content).toBe("GUARD");
  });
});
