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

  it("runs vision and reasoning steps against provider-scoped model ids", async () => {
    const create = vi
      .fn()
      .mockResolvedValueOnce({ choices: [{ message: { content: " extracted " } }] })
      .mockResolvedValueOnce({ choices: [{ message: { content: [{ text: " formatted " }] } }] });
    const client = new LiteLlmClient({
      baseUrl: "https://litellm.example.test/v1",
      apiKey: "sk-test",
      chatClient: { chat: { completions: { create } } }
    });

    await expect(
      client.runVisionStep({
        provider: "openai",
        imageUrl: "https://img.example.test/upl.jpg",
        prompt: "Read the document\n\n"
      })
    ).resolves.toBe("extracted");
    await expect(
      client.runReasoningStep({
        provider: "openai",
        input: "extracted",
        prompt: "Normalize the output\n\n"
      })
    ).resolves.toBe("formatted");

    expect(create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        model: "openai-image",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Read the document" },
              { type: "image_url", image_url: { url: "https://img.example.test/upl.jpg" } }
            ]
          }
        ]
      })
    );
    expect(create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        model: "openai-reasoning",
        messages: [
          { role: "system", content: "Normalize the output" },
          { role: "user", content: "extracted" }
        ]
      })
    );
  });
});
