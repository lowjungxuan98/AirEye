import { describe, expect, it, vi } from "vitest";
import { AgentWorkflowClient } from "../../../../src/libs/agent/client";

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as unknown as Response;
}

describe("AgentWorkflowClient", () => {
  it("posts provider/imageUrl/kind to /v1/workflow/run and maps the response", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ extractedText: "E", finalText: "F", steps: [{ prompt: "p", model: "image" }] })
    );
    const client = new AgentWorkflowClient({ baseUrl: "http://genai:8000/", apiKey: "k", fetchImpl });

    const result = await client.run({ provider: "openai", imageUrl: "https://x/upl_a.jpg" });

    expect(result).toEqual({
      extractedText: "E",
      finalText: "F",
      steps: [{ prompt: "p", model: "image" }]
    });
    const [url, init] = fetchImpl.mock.calls[0]! as [string, RequestInit];
    expect(url).toBe("http://genai:8000/v1/workflow/run");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["x-api-key"]).toBe("k");
    expect(JSON.parse(init.body as string)).toEqual({
      provider: "openai",
      imageUrl: "https://x/upl_a.jpg",
      kind: "import"
    });
  });

  it("passes the regenerate kind through", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ extractedText: "E", finalText: "F" }));
    const client = new AgentWorkflowClient({ baseUrl: "http://genai:8000", apiKey: "k", fetchImpl });

    await client.run({ provider: "openai", imageUrl: "https://x/upl_a.jpg", kind: "regenerate" });

    const init = fetchImpl.mock.calls[0]![1] as RequestInit;
    expect(JSON.parse(init.body as string).kind).toBe("regenerate");
  });

  it("throws INTERNAL_ERROR on a non-2xx response", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}, false, 502));
    const client = new AgentWorkflowClient({ baseUrl: "http://genai:8000", apiKey: "k", fetchImpl });

    await expect(
      client.run({ provider: "openai", imageUrl: "https://x/upl_a.jpg" })
    ).rejects.toMatchObject({ code: "INTERNAL_ERROR" });
  });

  it("throws INTERNAL_ERROR when the request itself fails", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("connection refused");
    });
    const client = new AgentWorkflowClient({ baseUrl: "http://genai:8000", apiKey: "k", fetchImpl });

    await expect(
      client.run({ provider: "openai", imageUrl: "https://x/upl_a.jpg" })
    ).rejects.toMatchObject({ code: "INTERNAL_ERROR" });
  });

  it("returns undefined steps when absent or malformed", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ extractedText: "E", finalText: "F", steps: "nope" })
    );
    const client = new AgentWorkflowClient({ baseUrl: "http://genai:8000", apiKey: "k", fetchImpl });

    const result = await client.run({ provider: "openai", imageUrl: "https://x/upl_a.jpg" });
    expect(result.steps).toBeUndefined();
  });
});
