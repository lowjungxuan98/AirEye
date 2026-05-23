export type LangfuseClientOptions = {
  baseUrl: string;
  publicKey: string;
  secretKey: string;
  /** Default label applied when callers don't pass one (e.g. `"production"`). */
  defaultLabel?: string;
};

export type FetchedPrompt = {
  text: string;
  version: number;
  labels: string[];
};

export type PromptListItem = {
  name: string;
  versions: number[];
  labels: string[];
  tags: string[];
  lastUpdatedAt: string;
};

export type GetPromptOptions = {
  label?: string;
  cacheTtlSeconds?: number;
  fetchTimeoutMs?: number;
};

export type ListPromptsOptions = {
  label?: string;
  limit?: number;
};
