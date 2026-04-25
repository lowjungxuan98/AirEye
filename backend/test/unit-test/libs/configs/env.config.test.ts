import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_NVIDIA_BASE_URL,
  DEFAULT_OPENROUTER_BASE_URL,
  DEFAULT_OPENROUTER_MODEL,
  loadServerEnv
} from "../../../../src/libs/configs/env.config";

const requiredBase = {
  S3_ENDPOINT: "http://127.0.0.1:9000",
  S3_ACCESS_KEY_ID: "test",
  S3_SECRET_ACCESS_KEY: "test",
  S3_REGION: "us-east-1",
  S3_PRESIGN_TTL_SECONDS: "604800",
  S3_BUCKET_DEVELOPMENT: "grim-development",
  S3_BUCKET_PRODUCTION: "grim-production",
  S3_BUCKET_TESTING: "testing",
  GOOGLE_APPLICATION_CREDENTIALS: "/path/cred.json",
  FIREBASE_PROJECT_ID: "proj",
  FIREBASE_DATABASE_URL: "https://proj.firebaseio.com"
} as const;

const llmKeys = [
  "LLM_PROVIDER",
  "LLM_API_KEY",
  "LLM_MODEL",
  "LLM_BASE_URL",
  "EXTRACT_LLM_PROVIDER",
  "EXTRACT_LLM_API_KEY",
  "EXTRACT_LLM_MODEL",
  "EXTRACT_LLM_BASE_URL",
  "FINAL_LLM_PROVIDER",
  "FINAL_LLM_API_KEY",
  "FINAL_LLM_MODEL",
  "FINAL_LLM_BASE_URL",
  "OPENROUTER_API_KEY",
  "OPENROUTER_MODEL",
  "OPENROUTER_IMAGE_MODEL",
  "OPENAI_API_KEY",
  "OPENAI_EXTRACT_MODEL",
  "OPENAI_FINAL_MODEL",
  "OPENAI_BASE_URL",
  "OPENROUTER_EXTRACT_MODEL",
  "OPENROUTER_FINAL_MODEL",
  "OPENROUTER_BASE_URL",
  "NVIDIA_API_KEY",
  "NVIDIA_EXTRACT_MODEL",
  "NVIDIA_FINAL_MODEL",
  "NVIDIA_BASE_URL"
] as const;

describe("loadServerEnv", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    for (const [k, v] of Object.entries(requiredBase)) {
      vi.stubEnv(k, v);
    }
    for (const key of llmKeys) {
      vi.stubEnv(key, "");
      delete process.env[key];
    }
    vi.stubEnv("OPENROUTER_API_KEY", "openrouter-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults PORT to 3001 when unset", () => {
    Reflect.deleteProperty(process.env, "PORT");
    const env = loadServerEnv();
    expect(env.PORT).toBe(3001);
  });

  it("parses PORT from the environment", () => {
    vi.stubEnv("PORT", "4000");
    expect(loadServerEnv().PORT).toBe(4000);
  });

  it("throws when PORT is not a positive number", () => {
    vi.stubEnv("PORT", "nope");
    expect(() => loadServerEnv()).toThrow(/Invalid PORT/);
  });

  it("throws when a required env var is missing", () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    delete process.env.OPENROUTER_API_KEY;
    expect(() => loadServerEnv()).toThrow(/Missing required env var EXTRACT_LLM_API_KEY/);
  });

  it("accepts Firebase credentials from base64 when the local file path is unset", () => {
    vi.stubEnv("GOOGLE_APPLICATION_CREDENTIALS", "");
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    vi.stubEnv(
      "FIREBASE_SERVICE_ACCOUNT_JSON_BASE64",
      Buffer.from(
        JSON.stringify({
          project_id: "proj",
          client_email: "firebase-adminsdk@example.test",
          private_key: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n"
        }),
        "utf8"
      ).toString("base64")
    );

    const env = loadServerEnv();
    expect(env.GOOGLE_APPLICATION_CREDENTIALS).toBeUndefined();
    expect(env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64).toBeDefined();
  });

  it("requires either a Firebase credentials path or base64 JSON", () => {
    vi.stubEnv("GOOGLE_APPLICATION_CREDENTIALS", "");
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    vi.stubEnv("FIREBASE_SERVICE_ACCOUNT_JSON_BASE64", "");
    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64;
    expect(() => loadServerEnv()).toThrow(/Missing Firebase credentials env/);
  });

  it("defaults legacy OpenRouter config into both stage configs", () => {
    const env = loadServerEnv();
    expect(env.EXTRACT_LLM).toEqual({
      provider: "openrouter",
      apiKey: "openrouter-key",
      model: DEFAULT_OPENROUTER_MODEL,
      baseURL: DEFAULT_OPENROUTER_BASE_URL
    });
    expect(env.FINAL_LLM).toEqual({
      provider: "openrouter",
      apiKey: "openrouter-key",
      model: DEFAULT_OPENROUTER_MODEL,
      baseURL: DEFAULT_OPENROUTER_BASE_URL
    });
  });

  it("maps legacy OpenRouter model aliases into both stage configs", () => {
    vi.stubEnv("OPENROUTER_MODEL", "openrouter/auto");
    vi.stubEnv("OPENROUTER_IMAGE_MODEL", "openrouter/free");
    const env = loadServerEnv();
    expect(env.EXTRACT_LLM.model).toBe("openrouter/auto");
    expect(env.FINAL_LLM.model).toBe("openrouter/auto");
    expect(env.EXTRACT_LLM.baseURL).toBe(DEFAULT_OPENROUTER_BASE_URL);
    expect(env.FINAL_LLM.baseURL).toBe(DEFAULT_OPENROUTER_BASE_URL);
  });

  it("uses shared LLM vars as defaults for both stages", () => {
    vi.stubEnv("LLM_PROVIDER", "openai");
    vi.stubEnv("LLM_API_KEY", "openai-key");
    vi.stubEnv("LLM_MODEL", "gpt-5.2");
    vi.stubEnv("LLM_BASE_URL", "https://example.test/v1");
    vi.stubEnv("OPENROUTER_MODEL", "openrouter/auto");
    const env = loadServerEnv();
    expect(env.EXTRACT_LLM).toEqual({
      provider: "openai",
      apiKey: "openai-key",
      model: "gpt-5.2",
      baseURL: "https://example.test/v1"
    });
    expect(env.FINAL_LLM).toEqual({
      provider: "openai",
      apiKey: "openai-key",
      model: "gpt-5.2",
      baseURL: "https://example.test/v1"
    });
  });

  it("lets one stage override the shared defaults", () => {
    vi.stubEnv("LLM_PROVIDER", "openrouter");
    vi.stubEnv("LLM_API_KEY", "router-key");
    vi.stubEnv("LLM_MODEL", "openrouter/auto");
    vi.stubEnv("FINAL_LLM_PROVIDER", "openai");
    vi.stubEnv("FINAL_LLM_API_KEY", "openai-key");
    vi.stubEnv("FINAL_LLM_MODEL", "gpt-5.2");
    const env = loadServerEnv();
    expect(env.EXTRACT_LLM).toEqual({
      provider: "openrouter",
      apiKey: "router-key",
      model: "openrouter/auto",
      baseURL: DEFAULT_OPENROUTER_BASE_URL
    });
    expect(env.FINAL_LLM).toEqual({
      provider: "openai",
      apiKey: "openai-key",
      model: "gpt-5.2",
      baseURL: undefined
    });
  });

  it("does not inherit shared model when a stage changes provider", () => {
    vi.stubEnv("LLM_PROVIDER", "openrouter");
    vi.stubEnv("LLM_API_KEY", "router-key");
    vi.stubEnv("LLM_MODEL", "openrouter/auto");
    vi.stubEnv("FINAL_LLM_PROVIDER", "openai");
    vi.stubEnv("FINAL_LLM_API_KEY", "openai-key");
    expect(() => loadServerEnv()).toThrow(/Missing required env var FINAL_LLM_MODEL/);
  });

  it("uses provider-specific runtime vars when stage-specific vars are unset", () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    delete process.env.OPENROUTER_API_KEY;
    vi.stubEnv("OPENAI_API_KEY", "openai-key");
    vi.stubEnv("OPENAI_EXTRACT_MODEL", "gpt-extract");
    vi.stubEnv("OPENAI_FINAL_MODEL", "gpt-final");
    const env = loadServerEnv();
    expect(env.EXTRACT_LLM).toEqual({
      provider: "openai",
      apiKey: "openai-key",
      model: "gpt-extract",
      baseURL: undefined
    });
    expect(env.FINAL_LLM).toEqual({
      provider: "openai",
      apiKey: "openai-key",
      model: "gpt-final",
      baseURL: undefined
    });
  });

  it("defaults NVIDIA provider-specific base URL for runtime config", () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    delete process.env.OPENROUTER_API_KEY;
    vi.stubEnv("NVIDIA_API_KEY", "nim-key");
    vi.stubEnv("NVIDIA_EXTRACT_MODEL", "nvidia/extract");
    vi.stubEnv("NVIDIA_FINAL_MODEL", "nvidia/final");
    const env = loadServerEnv();
    expect(env.EXTRACT_LLM).toEqual({
      provider: "nvidia_nim",
      apiKey: "nim-key",
      model: "nvidia/extract",
      baseURL: DEFAULT_NVIDIA_BASE_URL
    });
    expect(env.FINAL_LLM.model).toBe("nvidia/final");
  });

  it("uses the default NVIDIA base URL for a stage using NVIDIA NIM", () => {
    vi.stubEnv("EXTRACT_LLM_PROVIDER", "nvidia_nim");
    vi.stubEnv("EXTRACT_LLM_API_KEY", "nim-key");
    vi.stubEnv("EXTRACT_LLM_MODEL", "nvidia/llama-3.1-nemotron-nano-vl-8b-v1");
    expect(loadServerEnv().EXTRACT_LLM.baseURL).toBe(DEFAULT_NVIDIA_BASE_URL);
  });

  it("accepts stage-specific NVIDIA NIM config when the base URL is set", () => {
    vi.stubEnv("EXTRACT_LLM_PROVIDER", "nvidia_nim");
    vi.stubEnv("EXTRACT_LLM_API_KEY", "nim-key");
    vi.stubEnv("EXTRACT_LLM_MODEL", "nvidia/llama-3.1-nemotron-nano-vl-8b-v1");
    vi.stubEnv("EXTRACT_LLM_BASE_URL", "http://localhost:8000/v1");
    const env = loadServerEnv();
    expect(env.EXTRACT_LLM).toEqual({
      provider: "nvidia_nim",
      apiKey: "nim-key",
      model: "nvidia/llama-3.1-nemotron-nano-vl-8b-v1",
      baseURL: "http://localhost:8000/v1"
    });
    expect(env.FINAL_LLM.provider).toBe("openrouter");
  });

  it("rejects unknown providers", () => {
    vi.stubEnv("EXTRACT_LLM_PROVIDER", "other");
    expect(() => loadServerEnv()).toThrow(/Invalid LLM_PROVIDER/);
  });

  it("returns optional vars when set and undefined when blank", () => {
    vi.stubEnv("SCALAR_DOCS_URL", " https://docs.example ");
    vi.stubEnv("GRIM_FCM_TOPIC", "");
    delete process.env.GRIM_FCM_TOPIC;
    vi.stubEnv("GRIM_PROMPTS_DIR", "/tmp/prompts");
    const env = loadServerEnv();
    expect(env.SCALAR_DOCS_URL).toBe("https://docs.example");
    expect(env.GRIM_FCM_TOPIC).toBeUndefined();
    expect(env.GRIM_PROMPTS_DIR).toBe("/tmp/prompts");
    expect(env.GRIM_PROMPT_ADMIN_SECRET).toBeUndefined();
  });
});
