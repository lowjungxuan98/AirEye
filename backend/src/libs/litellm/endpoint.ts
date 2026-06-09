/** `GET /models` query string used for provider discovery. */
export const MODEL_DISCOVERY_QUERY =
  "return_wildcard_routes=false&include_model_access_groups=false&only_model_access_groups=false&include_metadata=false";

/** Match `provider-image` or `provider-reasoning` and split into `[_, provider, stage]`. */
export const STAGE_MODEL_PATTERN = /^(.+)-(image|reasoning)$/;

export function buildModelsUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/models?${MODEL_DISCOVERY_QUERY}`;
}

