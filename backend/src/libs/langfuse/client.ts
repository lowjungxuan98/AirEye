import type { LangfuseClient as LangfuseSdkClient } from "@langfuse/client" with { "resolution-mode": "import" };
import {
  DEFAULT_FETCH_TIMEOUT_MS,
  DEFAULT_LIST_PAGE_SIZE,
  DEFAULT_PROMPT_CACHE_TTL_SECONDS
} from "./constants";
import type {
  FetchedPrompt,
  GetPromptOptions,
  LangfuseClientOptions,
  ListPromptsOptions,
  PromptListItem
} from "./type";

export class LangfuseClient {
  private readonly options: LangfuseClientOptions;
  private readonly defaultLabel: string | undefined;
  private sdkPromise: Promise<LangfuseSdkClient> | null = null;

  constructor(options: LangfuseClientOptions) {
    this.options = options;
    this.defaultLabel = options.defaultLabel;
  }

  async getPrompt(name: string, options?: GetPromptOptions): Promise<FetchedPrompt> {
    const sdk = await this.getSdk();
    const label = options?.label ?? this.defaultLabel;
    const prompt = await sdk.prompt.get(name, {
      type: "text",
      label,
      cacheTtlSeconds: options?.cacheTtlSeconds ?? DEFAULT_PROMPT_CACHE_TTL_SECONDS,
      fetchTimeoutMs: options?.fetchTimeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS
    });
    return {
      text: prompt.prompt,
      version: prompt.version,
      labels: prompt.labels ?? []
    };
  }

  async listPrompts(options?: ListPromptsOptions): Promise<PromptListItem[]> {
    const sdk = await this.getSdk();
    const label = options?.label ?? this.defaultLabel;
    const limit = options?.limit ?? DEFAULT_LIST_PAGE_SIZE;
    const all: PromptListItem[] = [];
    let page = 1;

    while (true) {
      const response = await sdk.api.prompts.list({ label, page, limit });
      for (const meta of response.data ?? []) {
        all.push({
          name: meta.name,
          versions: meta.versions ?? [],
          labels: meta.labels ?? [],
          tags: meta.tags ?? [],
          lastUpdatedAt: meta.lastUpdatedAt
        });
      }
      const totalPages = response.meta?.totalPages ?? 1;
      if (page >= totalPages) break;
      page += 1;
    }

    return all;
  }

  async shutdown(): Promise<void> {
    if (!this.sdkPromise) return;
    const sdk = await this.sdkPromise;
    await sdk.flush();
  }

  private async getSdk(): Promise<LangfuseSdkClient> {
    if (!this.sdkPromise) {
      this.sdkPromise = import("@langfuse/client").then(
        (mod) =>
          new mod.LangfuseClient({
            baseUrl: this.options.baseUrl,
            publicKey: this.options.publicKey,
            secretKey: this.options.secretKey
          })
      );
    }
    return this.sdkPromise;
  }
}
