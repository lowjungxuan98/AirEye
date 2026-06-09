import { internalError } from "../utils/api-error.util";
import { parseLlmProvider, type LlmProvider } from "../configs/env.config";
import { STAGE_IMAGE, STAGE_REASONING, type ModelStage } from "./constants";
import { STAGE_MODEL_PATTERN, buildModelsUrl } from "./endpoint";
import type { LiteLlmClientOptions, LiteLlmModelsResponse } from "./type";

export class LiteLlmClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: LiteLlmClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.apiKey = options.apiKey;
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
