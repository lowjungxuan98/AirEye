/** Header the genai service expects (matches the backend's own API key header). */
export const AGENT_API_KEY_HEADER = "x-api-key";

/** genai HTTP routes. */
export const WORKFLOW_RUN_PATH = "/v1/workflow/run";
export const GENAI_HEALTH_PATH = "/health";

/** Workflow runs are long (multi-step vision + reasoning), so allow a generous timeout. */
export const DEFAULT_AGENT_TIMEOUT_MS = 120_000;
