/** Stage names used in `${provider}-${stage}` LiteLLM model ids. */
export const STAGE_IMAGE = "image" as const;
export const STAGE_REASONING = "reasoning" as const;

export type ModelStage = typeof STAGE_IMAGE | typeof STAGE_REASONING;

/** Vision/tool-calling temperature: deterministic single-shot output. */
export const VISION_TEMPERATURE = 0;

/** Reasoning step temperature: small amount of variation for prose smoothing. */
export const REASONING_TEMPERATURE = 0.15;

/**
 * Provider-specific `extra_body` passthrough that disables chain-of-thought
 * (GLM defaults to it, which can stall vision JSON output). Ignored by
 * providers that don't recognise the field.
 */
export const DISABLE_THINKING_EXTRA_BODY = {
  thinking: { type: "disabled" }
} as const;
