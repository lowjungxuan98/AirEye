import { internalError } from "../utils/api-error.util";
import { parseLlmProvider, type LlmProvider } from "../configs/env.config";

const MODEL_DISCOVERY_QUERY =
  "return_wildcard_routes=false&include_model_access_groups=false&only_model_access_groups=false&include_metadata=false";
const STAGE_MODEL_PATTERN = /^(.+)-(image|reasoning)$/;

type LiteLlmModelsResponse = {
  data?: Array<{ id?: unknown }>;
};

export type LiteLlmModelDiscoveryOptions = {
  baseUrl: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
};

export class LiteLlmModelDiscovery {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: LiteLlmModelDiscoveryOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async getAvailableProviders(): Promise<LlmProvider[]> {
    const response = await this.fetchImpl(`${this.baseUrl}/models?${MODEL_DISCOVERY_QUERY}`, {
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
  const stagesByProvider = new Map<LlmProvider, Set<"image" | "reasoning">>();

  for (const model of body.data ?? []) {
    if (typeof model.id !== "string") continue;
    const match = STAGE_MODEL_PATTERN.exec(model.id.trim().toLowerCase());
    if (!match) continue;

    const provider = parseLlmProvider(match[1]);
    const stage = match[2] as "image" | "reasoning";
    const stages = stagesByProvider.get(provider) ?? new Set<"image" | "reasoning">();
    stages.add(stage);
    stagesByProvider.set(provider, stages);
  }

  return [...stagesByProvider.entries()]
    .filter(([, stages]) => stages.has("image") && stages.has("reasoning"))
    .map(([provider]) => provider);
}
