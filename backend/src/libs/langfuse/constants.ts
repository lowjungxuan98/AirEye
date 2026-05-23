/** SDK package id loaded via dynamic `import()` to bridge ESM into CommonJS. */
export const LANGFUSE_SDK_PACKAGE = "@langfuse/client";

/** Default label fetched when the caller doesn't specify one. */
export const DEFAULT_LANGFUSE_LABEL = "production";

/** Default `fetchTimeoutMs` passed to `prompt.get`. */
export const DEFAULT_FETCH_TIMEOUT_MS = 15_000;

/** Default `cacheTtlSeconds` passed to `prompt.get` (0 = no cache, always fresh). */
export const DEFAULT_PROMPT_CACHE_TTL_SECONDS = 0;

/** Default page size when paginating `api.prompts.list`. */
export const DEFAULT_LIST_PAGE_SIZE = 100;

/** Default tool-reasoning prompt name fetched by `ToolReasoning`. */
export const DEFAULT_TOOL_REASONING_PROMPT_NAME = "tool-reasoning";
