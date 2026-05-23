import OpenAI from "openai";
import { internalError } from "../utils/api-error.util";
import { parseLlmProvider, type LlmProvider } from "../configs/env.config";
import {
  STAGE_IMAGE,
  STAGE_REASONING,
  VISION_MAX_TOKENS,
  VISION_TEMPERATURE,
  REASONING_MAX_TOKENS,
  REASONING_TEMPERATURE,
  DISABLE_THINKING_EXTRA_BODY,
  type ModelStage
} from "./constants";
import { STAGE_MODEL_PATTERN, buildModelsUrl, buildModelId } from "./endpoint";
import type {
  LiteLlmClientOptions,
  LiteLlmModelsResponse,
  OpenAICompatibleChatClient,
  RunReasoningStepInput,
  RunVisionStepInput
} from "./type";

export class LiteLlmClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly chatClient: OpenAICompatibleChatClient;
  private readonly fetchImpl: typeof fetch;

  constructor(options: LiteLlmClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.chatClient =
      options.chatClient ?? new OpenAI({ apiKey: options.apiKey, baseURL: options.baseUrl });
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async getAvailableProviders(): Promise<LlmProvider[]> {
    const response = await this.fetchImpl(buildModelsUrl(this.baseUrl), {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${this.apiKey}`
      }
    });

    if (!response.ok) {
      throw internalError(`LiteLLM models API failed with HTTP ${response.status}`);
    }

    const body = (await response.json()) as LiteLlmModelsResponse;
    return providersFromLiteLlmModels(body);
  }

  async runVisionStep({ provider, imageUrl, prompt }: RunVisionStepInput): Promise<string> {
    const response = await this.chatClient.chat.completions.create({
      model: buildModelId(provider, STAGE_IMAGE),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt.trimEnd() },
            { type: "image_url", image_url: { url: imageUrl } }
          ]
        }
      ],
      extra_body: { ...DISABLE_THINKING_EXTRA_BODY },
      max_tokens: VISION_MAX_TOKENS,
      temperature: VISION_TEMPERATURE
    });

    return normalizeAssistantContent(response.choices?.[0]?.message?.content);
  }

  async runReasoningStep({ provider, input, prompt }: RunReasoningStepInput): Promise<string> {
    const response = await this.chatClient.chat.completions.create({
      model: buildModelId(provider, STAGE_REASONING),
      messages: [
        { role: "system", content: prompt.trimEnd() },
        { role: "user", content: input }
      ],
      max_tokens: REASONING_MAX_TOKENS,
      temperature: REASONING_TEMPERATURE
    });

    return normalizeAssistantContent(response.choices?.[0]?.message?.content);
  }
}

export function providersFromLiteLlmModels(body: LiteLlmModelsResponse): LlmProvider[] {
  const stagesByProvider = new Map<LlmProvider, Set<ModelStage>>();

  for (const model of body.data ?? []) {
    if (typeof model.id !== "string") continue;
    const match = STAGE_MODEL_PATTERN.exec(model.id.trim().toLowerCase());
    if (!match) continue;

    const provider = parseLlmProvider(match[1]!);
    const stage = match[2] as ModelStage;
    const stages = stagesByProvider.get(provider) ?? new Set<ModelStage>();
    stages.add(stage);
    stagesByProvider.set(provider, stages);
  }

  return [...stagesByProvider.entries()]
    .filter(([, stages]) => stages.has(STAGE_IMAGE) && stages.has(STAGE_REASONING))
    .map(([provider]) => provider);
}

function normalizeAssistantContent(content: unknown): string {
  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (typeof part !== "object" || part === null) return "";
        const text = (part as { text?: unknown }).text;
        return typeof text === "string" ? text : "";
      })
      .join("\n")
      .trim();
  }

  return "";
}
