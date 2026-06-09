export type AgentWorkflowClientOptions = {
  baseUrl: string;
  apiKey: string;
  /** Override `fetch` (for tests). */
  fetchImpl?: typeof fetch;
  /** Request timeout in milliseconds (default `DEFAULT_AGENT_TIMEOUT_MS`). */
  timeoutMs?: number;
};

/** Raw JSON shape returned by `POST /v1/workflow/run` (already camelCase). */
export type AgentWorkflowRunResponse = {
  extractedText?: unknown;
  finalText?: unknown;
  steps?: unknown;
  traceId?: unknown;
};
