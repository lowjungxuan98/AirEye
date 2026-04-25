export type LlmProvider = "openrouter" | "openai" | "nvidia_nim";

export const DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
export const DEFAULT_OPENROUTER_MODEL = "openrouter/free";
export const DEFAULT_NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";

export type LlmConfig = {
  provider: LlmProvider;
  apiKey: string;
  model: string;
  baseURL?: string;
};

export type ServerEnv = {
  PORT: number;
  S3_ENDPOINT: string;
  S3_ACCESS_KEY_ID: string;
  S3_SECRET_ACCESS_KEY: string;
  S3_REGION: string;
  S3_BUCKET_DEVELOPMENT: string;
  S3_BUCKET_PRODUCTION: string;
  S3_BUCKET_TESTING: string;
  S3_PRESIGN_TTL_SECONDS: number;
  GOOGLE_APPLICATION_CREDENTIALS?: string;
  FIREBASE_SERVICE_ACCOUNT_JSON_BASE64?: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_DATABASE_URL: string;
  EXTRACT_LLM: LlmConfig;
  FINAL_LLM: LlmConfig;
  /** Optional URL of a Scalar-hosted API Reference; local spec is always `GET /openapi.yaml`. */
  SCALAR_DOCS_URL?: string;
  /**
   * FCM topic for `broadcastNewResult` (default `grim_new_result`). Clients must subscribe to this topic.
   */
  GRIM_FCM_TOPIC?: string;
  /** Directory containing `extract_text_prompt.txt`, `analyzing_text_prompt.txt`, and `format_guard_prompt.txt` (default `./prompts` from process cwd). */
  GRIM_PROMPTS_DIR?: string;
  /** When set, `GET`/`PUT /api/v1/prompts` require header `X-Grim-Prompt-Secret` with this exact value. */
  GRIM_PROMPT_ADMIN_SECRET?: string;
};

export function loadServerEnv(): ServerEnv {
  const portRaw = process.env.PORT ?? "3001";
  const port = Number(portRaw);
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`Invalid PORT: ${portRaw}`);
  }

  const sharedLlm = loadSharedLlmEnv();

  return {
    PORT: port,
    S3_ENDPOINT: readRequiredEnv("S3_ENDPOINT"),
    S3_ACCESS_KEY_ID: readRequiredEnv("S3_ACCESS_KEY_ID"),
    S3_SECRET_ACCESS_KEY: readRequiredEnv("S3_SECRET_ACCESS_KEY"),
    S3_REGION: readRequiredEnv("S3_REGION"),
    S3_BUCKET_DEVELOPMENT: readRequiredEnv("S3_BUCKET_DEVELOPMENT"),
    S3_BUCKET_PRODUCTION: readRequiredEnv("S3_BUCKET_PRODUCTION"),
    S3_BUCKET_TESTING: readRequiredEnv("S3_BUCKET_TESTING"),
    S3_PRESIGN_TTL_SECONDS: readRequiredIntEnv("S3_PRESIGN_TTL_SECONDS"),
    ...loadFirebaseCredentialsEnv(),
    FIREBASE_PROJECT_ID: readRequiredEnv("FIREBASE_PROJECT_ID"),
    FIREBASE_DATABASE_URL: readRequiredEnv("FIREBASE_DATABASE_URL"),
    EXTRACT_LLM: loadStageLlmEnv("EXTRACT", sharedLlm),
    FINAL_LLM: loadStageLlmEnv("FINAL", sharedLlm),
    SCALAR_DOCS_URL: readOptionalEnv("SCALAR_DOCS_URL"),
    GRIM_FCM_TOPIC: readOptionalEnv("GRIM_FCM_TOPIC"),
    GRIM_PROMPTS_DIR: readOptionalEnv("GRIM_PROMPTS_DIR"),
    GRIM_PROMPT_ADMIN_SECRET: readOptionalEnv("GRIM_PROMPT_ADMIN_SECRET")
  };
}

export function resolveS3Bucket(env: Pick<ServerEnv, "S3_BUCKET_DEVELOPMENT" | "S3_BUCKET_PRODUCTION" | "S3_BUCKET_TESTING">): string {
  const nodeEnv = (process.env.NODE_ENV ?? "development").trim().toLowerCase();
  if (nodeEnv === "production") return env.S3_BUCKET_PRODUCTION;
  if (nodeEnv === "test") return env.S3_BUCKET_TESTING;
  return env.S3_BUCKET_DEVELOPMENT;
}

function readOptionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required env var ${name}`);
  }

  return value;
}

function readOptionalIntEnv(name: string): number | undefined {
  const raw = readOptionalEnv(name);
  if (!raw) return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Invalid ${name}: ${raw}`);
  }
  return Math.floor(value);
}

function readRequiredIntEnv(name: string): number {
  const raw = readRequiredEnv(name);
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Invalid ${name}: ${raw}`);
  }
  return Math.floor(value);
}

function loadFirebaseCredentialsEnv(): Pick<
  ServerEnv,
  "GOOGLE_APPLICATION_CREDENTIALS" | "FIREBASE_SERVICE_ACCOUNT_JSON_BASE64"
> {
  const credentialsPath = readOptionalEnv("GOOGLE_APPLICATION_CREDENTIALS");
  const serviceAccountBase64 = readOptionalEnv("FIREBASE_SERVICE_ACCOUNT_JSON_BASE64");

  if (!credentialsPath && !serviceAccountBase64) {
    throw new Error(
      "Missing Firebase credentials env: set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON_BASE64"
    );
  }

  return {
    GOOGLE_APPLICATION_CREDENTIALS: credentialsPath,
    FIREBASE_SERVICE_ACCOUNT_JSON_BASE64: serviceAccountBase64
  };
}

function loadSharedLlmEnv(): Partial<LlmConfig> {
  const explicitProvider = readOptionalEnv("LLM_PROVIDER");
  const llmProvider = explicitProvider
    ? parseLlmProvider(explicitProvider)
    : resolveDefaultProviderFromLegacyConfig();
  const apiKey = readOptionalEnv("LLM_API_KEY") ?? readOptionalEnv("OPENROUTER_API_KEY");
  const model =
    readOptionalEnv("LLM_MODEL") ??
    readOptionalEnv("OPENROUTER_MODEL") ??
    readOptionalEnv("OPENROUTER_IMAGE_MODEL") ??
    (llmProvider === "openrouter" ? DEFAULT_OPENROUTER_MODEL : undefined);
  const baseURL =
    readOptionalEnv("LLM_BASE_URL") ??
    (llmProvider === "openrouter" ? DEFAULT_OPENROUTER_BASE_URL : undefined);

  return {
    provider: apiKey || model || baseURL || explicitProvider ? llmProvider : undefined,
    apiKey,
    model,
    baseURL
  };
}

function readProviderSpecificLlmEnv(provider: LlmProvider, stage: "EXTRACT" | "FINAL"): Partial<LlmConfig> {
  const prefix = provider === "nvidia_nim" ? "NVIDIA" : provider.toUpperCase();
  const legacyPrefix = provider === "nvidia_nim" ? "NVIDIA_NIM" : prefix;
  const model =
    readOptionalEnv(`${prefix}_${stage}_MODEL`) ??
    readOptionalEnv(`${legacyPrefix}_${stage}_MODEL`) ??
    readOptionalEnv(`${prefix}_MODEL`) ??
    readOptionalEnv(`${legacyPrefix}_MODEL`) ??
    (provider === "openrouter" ? DEFAULT_OPENROUTER_MODEL : undefined);
  const baseURL =
    readOptionalEnv(`${prefix}_BASE_URL`) ??
    readOptionalEnv(`${legacyPrefix}_BASE_URL`) ??
    (provider === "openrouter" ? DEFAULT_OPENROUTER_BASE_URL : undefined) ??
    (provider === "nvidia_nim" ? DEFAULT_NVIDIA_BASE_URL : undefined);

  return {
    provider,
    apiKey: readOptionalEnv(`${prefix}_API_KEY`) ?? readOptionalEnv(`${legacyPrefix}_API_KEY`),
    model,
    baseURL
  };
}

function parseLlmProvider(value: string): LlmProvider {
  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue === "openrouter" || normalizedValue === "openai") {
    return normalizedValue;
  }
  if (normalizedValue === "nvidia_nim" || normalizedValue === "nim") {
    return "nvidia_nim";
  }

  throw new Error(`Invalid LLM_PROVIDER: ${value}`);
}

function resolveDefaultProviderFromLegacyConfig(): LlmProvider {
  if (readOptionalEnv("OPENROUTER_API_KEY")) {
    return "openrouter";
  }
  if (readOptionalEnv("OPENAI_API_KEY")) {
    return "openai";
  }
  if (readOptionalEnv("NVIDIA_API_KEY") || readOptionalEnv("NVIDIA_NIM_API_KEY")) {
    return "nvidia_nim";
  }

  const hasLegacyOpenRouterConfig = Boolean(
    readOptionalEnv("OPENROUTER_MODEL") || readOptionalEnv("OPENROUTER_IMAGE_MODEL")
  );

  if (hasLegacyOpenRouterConfig) {
    return "openrouter";
  }

  return "openrouter";
}

function loadStageLlmEnv(stage: "EXTRACT" | "FINAL", sharedLlm: Partial<LlmConfig>): LlmConfig {
  const stageProviderRaw = readOptionalEnv(`${stage}_LLM_PROVIDER`);
  const stageProvider = stageProviderRaw ? parseLlmProvider(stageProviderRaw) : undefined;
  const provider = stageProvider ?? sharedLlm.provider ?? resolveDefaultProviderFromLegacyConfig();
  const canInheritSharedFields = !stageProvider || stageProvider === sharedLlm.provider;
  const providerSpecific = readProviderSpecificLlmEnv(provider, stage);
  const apiKey =
    readOptionalEnv(`${stage}_LLM_API_KEY`) ??
    (canInheritSharedFields ? sharedLlm.apiKey : undefined) ??
    providerSpecific.apiKey;
  if (!apiKey) {
    throw new Error(
      `Missing required env var ${stage}_LLM_API_KEY (or provider-specific ${providerEnvPrefix(provider)}_API_KEY)`
    );
  }

  const model =
    readOptionalEnv(`${stage}_LLM_MODEL`) ??
    (canInheritSharedFields ? sharedLlm.model : undefined) ??
    providerSpecific.model;
  if (!model) {
    throw new Error(
      `Missing required env var ${stage}_LLM_MODEL (or provider-specific ${providerEnvPrefix(provider)}_${stage}_MODEL)`
    );
  }

  const baseURL =
    readOptionalEnv(`${stage}_LLM_BASE_URL`) ??
    (canInheritSharedFields ? sharedLlm.baseURL : undefined) ??
    providerSpecific.baseURL;

  return {
    provider,
    apiKey,
    model,
    baseURL
  };
}

function providerEnvPrefix(provider: LlmProvider): "OPENROUTER" | "OPENAI" | "NVIDIA" {
  if (provider === "nvidia_nim") {
    return "NVIDIA";
  }
  return provider.toUpperCase() as "OPENROUTER" | "OPENAI";
}
