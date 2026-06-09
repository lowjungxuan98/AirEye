import { describe, expect, it, vi } from "vitest";
import { LiteLlmClient, providersFromLiteLlmModels } from "../../../../src/libs/litellm/client";

describe("providersFromLiteLlmModels", () => {
  it("returns providers that expose both image and reasoning models", () => {
    expect(
      providersFromLiteLlmModels({
        data: [
          { id: "openai-image" },
          { id: "openai-reasoning" },
          { id: "glm-image" },
          { id: "ignored-model" },
          { id: "NVIDIA_NIM-Reasoning" },
          { id: "nvidia_nim-image" }
        ]
      })
    ).toEqual(["openai", "nvidia_nim"]);
  });
});

describe("LiteLlmClient", () => {
  it("discovers available providers from the models endpoint", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: [{ id: "openai-image" }, { id: "openai-reasoning" }]
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    const client = new LiteLlmClient({
      baseUrl: "https://litellm.example.test/v1/",
      apiKey: "sk-test",
      fetchImpl
    });

    await expect(client.getAvailableProviders()).resolves.toEqual(["openai"]);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://litellm.example.test/v1/models?return_wildcard_routes=false&include_model_access_groups=false&only_model_access_groups=false&include_metadata=false",
      {
        method: "GET",
        headers: {
          accept: "application/json",
          authorization: "Bearer sk-test"
        }
      }
    );
  });

});
