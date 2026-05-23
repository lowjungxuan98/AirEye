export type LlmProvider = string;

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
  LLM_BASE_URL: string;
  LLM_API_KEY: string;
  /** Optional URL of a Scalar-hosted API Reference; local spec is always `GET /openapi.yaml`. */
  SCALAR_DOCS_URL?: string;
  /**
   * FCM topic for sender capture requests and receiver import refresh signals.
   */
  AIREYE_FCM_TOPIC?: string;
  /** Langfuse base URL (e.g. `https://cloud.langfuse.com`). */
  LANGFUSE_BASE_URL: string;
  LANGFUSE_PUBLIC_KEY: string;
  LANGFUSE_SECRET_KEY: string;
  /** Label used to fetch Langfuse prompts (default `production`). */
  LANGFUSE_LABEL?: string;
  /** Name of the Langfuse prompt that returns the workflow plan (default `tool-reasoning`). */
  TOOL_REASONING_PROMPT_NAME?: string;
};

export function loadServerEnv(): ServerEnv {
  const portRaw = process.env.PORT ?? "3001";
  const port = Number(portRaw);
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`Invalid PORT: ${portRaw}`);
  }

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
    LLM_BASE_URL: readRequiredEnv("LITELLM_BASE_URL"),
    LLM_API_KEY: readRequiredEnv("LITELLM_API_KEY"),
    SCALAR_DOCS_URL: readOptionalEnv("SCALAR_DOCS_URL"),
    AIREYE_FCM_TOPIC: readOptionalEnv("AIREYE_FCM_TOPIC"),
    LANGFUSE_BASE_URL: readRequiredEnv("LANGFUSE_BASE_URL"),
    LANGFUSE_PUBLIC_KEY: readRequiredEnv("LANGFUSE_PUBLIC_KEY"),
    LANGFUSE_SECRET_KEY: readRequiredEnv("LANGFUSE_SECRET_KEY"),
    LANGFUSE_LABEL: readOptionalEnv("LANGFUSE_LABEL"),
    TOOL_REASONING_PROMPT_NAME: readOptionalEnv("TOOL_REASONING_PROMPT_NAME")
  };
}

export function resolveS3Bucket(env: Pick<ServerEnv, "S3_BUCKET_DEVELOPMENT" | "S3_BUCKET_PRODUCTION" | "S3_BUCKET_TESTING">): string {
  const nodeEnv = (process.env.NODE_ENV ?? "development").trim().toLowerCase();
  if (nodeEnv === "production") return env.S3_BUCKET_PRODUCTION;
  if (nodeEnv === "test") return env.S3_BUCKET_TESTING;
  return env.S3_BUCKET_DEVELOPMENT;
}

export function resolveFcmBroadcastTopic(
  env: Pick<ServerEnv, "AIREYE_FCM_TOPIC">,
  defaultTopic: string
): string {
  return env.AIREYE_FCM_TOPIC ?? defaultTopic;
}

export function parseLlmProvider(value: string): LlmProvider {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    throw new Error("Invalid LLM provider: empty");
  }
  return normalized;
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
