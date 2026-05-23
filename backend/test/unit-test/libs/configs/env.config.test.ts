import { Buffer } from "node:buffer";
import process from "node:process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadServerEnv,
  parseLlmProvider,
  resolveFcmBroadcastTopic
} from "../../../../src/libs/configs/env.config";

const requiredBase = {
  S3_ENDPOINT: "http://127.0.0.1:9000",
  S3_ACCESS_KEY_ID: "test",
  S3_SECRET_ACCESS_KEY: "test",
  S3_REGION: "us-east-1",
  S3_PRESIGN_TTL_SECONDS: "604800",
  S3_BUCKET_DEVELOPMENT: "aireye-development",
  S3_BUCKET_PRODUCTION: "aireye-production",
  S3_BUCKET_TESTING: "testing",
  GOOGLE_APPLICATION_CREDENTIALS: "/path/cred.json",
  FIREBASE_PROJECT_ID: "proj",
  FIREBASE_DATABASE_URL: "https://proj.firebaseio.com",
  LITELLM_BASE_URL: "https://litellm.example.test/v1",
  LITELLM_API_KEY: "sk-test",
  LANGFUSE_BASE_URL: "https://langfuse.example.test",
  LANGFUSE_PUBLIC_KEY: "pk-test",
  LANGFUSE_SECRET_KEY: "sk-langfuse-test"
} as const;

describe("loadServerEnv", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    for (const [k, v] of Object.entries(requiredBase)) {
      vi.stubEnv(k, v);
    }
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
    vi.stubEnv("LITELLM_API_KEY", "");
    delete process.env.LITELLM_API_KEY;
    expect(() => loadServerEnv()).toThrow(/Missing required env var LITELLM_API_KEY/);
  });

  it("throws when LITELLM_BASE_URL is missing", () => {
    vi.stubEnv("LITELLM_BASE_URL", "");
    delete process.env.LITELLM_BASE_URL;
    expect(() => loadServerEnv()).toThrow(/Missing required env var LITELLM_BASE_URL/);
  });

  it.each([
    "LANGFUSE_BASE_URL",
    "LANGFUSE_PUBLIC_KEY",
    "LANGFUSE_SECRET_KEY"
  ] as const)("throws when %s is missing", (name) => {
    vi.stubEnv(name, "");
    delete process.env[name];
    expect(() => loadServerEnv()).toThrow(new RegExp(`Missing required env var ${name}`));
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

  it("loads LiteLLM and Langfuse settings from env", () => {
    const env = loadServerEnv();
    expect(env.LLM_BASE_URL).toBe("https://litellm.example.test/v1");
    expect(env.LLM_API_KEY).toBe("sk-test");
    expect(env.LANGFUSE_BASE_URL).toBe("https://langfuse.example.test");
    expect(env.LANGFUSE_PUBLIC_KEY).toBe("pk-test");
    expect(env.LANGFUSE_SECRET_KEY).toBe("sk-langfuse-test");
  });

  it("returns optional vars when set and undefined when blank", () => {
    vi.stubEnv("SCALAR_DOCS_URL", " https://docs.example ");
    vi.stubEnv("AIREYE_FCM_TOPIC", "");
    delete process.env.AIREYE_FCM_TOPIC;
    vi.stubEnv("LANGFUSE_LABEL", "staging");
    vi.stubEnv("TOOL_REASONING_PROMPT_NAME", "tool-reasoning-v2");
    const env = loadServerEnv();
    expect(env.SCALAR_DOCS_URL).toBe("https://docs.example");
    expect(env.AIREYE_FCM_TOPIC).toBeUndefined();
    expect(env.LANGFUSE_LABEL).toBe("staging");
    expect(env.TOOL_REASONING_PROMPT_NAME).toBe("tool-reasoning-v2");
  });

  it("uses only the AirEye FCM topic before falling back to the AirEye default", () => {
    vi.stubEnv("AIREYE_FCM_TOPIC", " aireye_topic ");
    let env = loadServerEnv();
    expect(env.AIREYE_FCM_TOPIC).toBe("aireye_topic");
    expect(resolveFcmBroadcastTopic(env, "aireye_new_result")).toBe("aireye_topic");

    vi.stubEnv("AIREYE_FCM_TOPIC", "");
    delete process.env.AIREYE_FCM_TOPIC;
    env = loadServerEnv();
    expect(env.AIREYE_FCM_TOPIC).toBeUndefined();
    expect(resolveFcmBroadcastTopic(env, "aireye_new_result")).toBe("aireye_new_result");
  });
});

describe("parseLlmProvider", () => {
  it("normalizes provider values", () => {
    expect(parseLlmProvider("openai")).toBe("openai");
    expect(parseLlmProvider("openrouter")).toBe("openrouter");
    expect(parseLlmProvider("deepseek")).toBe("deepseek");
    expect(parseLlmProvider("glm")).toBe("glm");
    expect(parseLlmProvider("nvidia_nim")).toBe("nvidia_nim");
    expect(parseLlmProvider("  Future_Provider  ")).toBe("future_provider");
  });

  it("throws for empty providers", () => {
    expect(() => parseLlmProvider(" ")).toThrow(/Invalid LLM provider/);
  });
});
