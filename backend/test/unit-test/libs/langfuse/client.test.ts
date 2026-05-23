import { beforeEach, describe, expect, it, vi } from "vitest";

const flushMock = vi.hoisted(() => vi.fn(async () => {}));
const promptGetMock = vi.hoisted(() => vi.fn());
const promptsListMock = vi.hoisted(() => vi.fn());
const LangfuseSdkClientMock = vi.hoisted(() =>
  vi.fn(function LangfuseSdkClient() {
    return {
      prompt: { get: promptGetMock },
      api: { prompts: { list: promptsListMock } },
      flush: flushMock
    };
  })
);

vi.mock("@langfuse/client", () => ({
  LangfuseClient: LangfuseSdkClientMock
}));

import { LangfuseClient } from "../../../../src/libs/langfuse/client";

describe("LangfuseClient", () => {
  beforeEach(() => {
    flushMock.mockClear();
    promptGetMock.mockReset();
    promptsListMock.mockReset();
    LangfuseSdkClientMock.mockClear();
  });

  it("fetches text prompts with the configured default label", async () => {
    promptGetMock.mockResolvedValue({
      prompt: "Normalize this output",
      version: 7,
      labels: ["production"]
    });
    const client = new LangfuseClient({
      baseUrl: "https://langfuse.example.test",
      publicKey: "pk",
      secretKey: "sk",
      defaultLabel: "production"
    });

    await expect(client.getPrompt("formatted-result")).resolves.toEqual({
      text: "Normalize this output",
      version: 7,
      labels: ["production"]
    });

    expect(LangfuseSdkClientMock).toHaveBeenCalledWith({
      baseUrl: "https://langfuse.example.test",
      publicKey: "pk",
      secretKey: "sk"
    });
    expect(promptGetMock).toHaveBeenCalledWith("formatted-result", {
      type: "text",
      label: "production",
      cacheTtlSeconds: 0,
      fetchTimeoutMs: 15_000
    });
  });

  it("lists prompts across Langfuse pages", async () => {
    promptsListMock
      .mockResolvedValueOnce({
        data: [{ name: "vision-step", versions: [1], labels: ["production"], tags: [] }],
        meta: { totalPages: 2 }
      })
      .mockResolvedValueOnce({
        data: [
          {
            name: "formatted-result",
            versions: [3],
            labels: ["production"],
            tags: ["workflow"],
            lastUpdatedAt: "2026-05-23T00:00:00.000Z"
          }
        ],
        meta: { totalPages: 2 }
      });
    const client = new LangfuseClient({
      baseUrl: "https://langfuse.example.test",
      publicKey: "pk",
      secretKey: "sk",
      defaultLabel: "production"
    });

    await expect(client.listPrompts({ limit: 1 })).resolves.toEqual([
      { name: "vision-step", versions: [1], labels: ["production"], tags: [] },
      {
        name: "formatted-result",
        versions: [3],
        labels: ["production"],
        tags: ["workflow"],
        lastUpdatedAt: "2026-05-23T00:00:00.000Z"
      }
    ]);

    expect(promptsListMock).toHaveBeenNthCalledWith(1, {
      label: "production",
      page: 1,
      limit: 1
    });
    expect(promptsListMock).toHaveBeenNthCalledWith(2, {
      label: "production",
      page: 2,
      limit: 1
    });
  });
});
