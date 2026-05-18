import { describe, expect, it } from "vitest";
import {
  LiteLlmModelDiscovery,
  providersFromLiteLlmModels
} from "../../../../src/libs/llm/model-discovery";

describe("LiteLlmModelDiscovery", () => {
  it("fetches LiteLLM model routes with the expected URL and authorization header", async () => {
    let requestedUrl = "";
    let requestedInit: RequestInit | undefined;
    const fetchImpl: typeof fetch = async (input, init) => {
      requestedUrl = String(input);
      requestedInit = init;
      return new Response(
        JSON.stringify({
          data: [{ id: "alpha-image" }, { id: "alpha-reasoning" }]
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    };
    const discovery = new LiteLlmModelDiscovery({
      baseUrl: "https://litellm.example.test/v1/",
      apiKey: "sk-test",
      fetchImpl
    });

    await expect(discovery.getAvailableProviders()).resolves.toEqual(["alpha"]);

    expect(requestedUrl).toBe(
      "https://litellm.example.test/v1/models?return_wildcard_routes=false&include_model_access_groups=false&only_model_access_groups=false&include_metadata=false"
    );
    expect(requestedInit).toEqual({
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: "Bearer sk-test"
      }
    });
  });
});

describe("providersFromLiteLlmModels", () => {
  it("returns providers with both image and reasoning routes", () => {
    expect(
      providersFromLiteLlmModels({
        data: [
          { id: "openai-image" },
          { id: "openai-reasoning" },
          { id: "deepseek-image" },
          { id: "nvidia-reasoning" },
          { id: "glm-image" },
          { id: "glm-reasoning" },
          { id: "other" },
          { id: "future-provider-image" },
          { id: "future-provider-reasoning" }
        ]
      })
    ).toEqual(["openai", "glm", "future-provider"]);
  });

  it("ignores incomplete provider routes", () => {
    expect(
      providersFromLiteLlmModels({
        data: [
          { id: "image-only-image" },
          { id: "reasoning-only-reasoning" },
          { id: "complete-image" },
          { id: "complete-reasoning" }
        ]
      })
    ).toEqual(["complete"]);
  });
});
