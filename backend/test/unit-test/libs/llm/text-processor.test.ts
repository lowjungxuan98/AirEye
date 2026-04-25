import { describe, expect, it, vi } from "vitest";
import { OpenAICompatibleTextProcessor } from "../../../../src/libs/llm/text-processor";

describe("OpenAICompatibleTextProcessor", () => {
  it("calls chat completions with prompt text and a data URL image", async () => {
    const create = vi.fn(async () => ({
      choices: [{ message: { content: " extracted text \n" } }]
    }));
    const processor = new OpenAICompatibleTextProcessor({
      apiKey: "test-key",
      model: "openrouter/free",
      baseURL: "https://openrouter.ai/api/v1",
      getExtractPromptText: () => "instruction line\n",
      getAnalyzingSystemPrompt: () => "analyze",
      getFormatGuardSystemPrompt: () => "guard",
      client: { chat: { completions: { create } } }
    });

    const out = await processor.extractTextFromImage(Buffer.from([1, 2, 3]), "image/jpg");

    expect(out).toBe("extracted text");
    expect(create).toHaveBeenCalledWith({
      model: "openrouter/free",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "instruction line" },
            {
              type: "image_url",
              image_url: { url: "data:image/jpeg;base64,AQID" }
            }
          ]
        }
      ],
      max_tokens: 4096,
      temperature: 0.15
    });
  });

  it("normalizes array content responses", async () => {
    const create = vi.fn(async () => ({
      choices: [{ message: { content: [{ text: "a" }, { text: "b" }] } }]
    }));
    const processor = new OpenAICompatibleTextProcessor({
      apiKey: "test-key",
      model: "custom/model",
      getExtractPromptText: () => "instruction",
      getAnalyzingSystemPrompt: () => "analyze",
      getFormatGuardSystemPrompt: () => "guard",
      client: { chat: { completions: { create } } }
    });

    await expect(processor.extractTextFromImage(Buffer.from("img"), "image/png")).resolves.toBe(
      "a\nb"
    );
  });

  it("calls chat completions with the analyzing prompt and extracted text", async () => {
    const create = vi.fn(async () => ({
      choices: [{ message: { content: " final text " } }]
    }));
    const processor = new OpenAICompatibleTextProcessor({
      apiKey: "test-key",
      model: "custom/model",
      getExtractPromptText: () => "extract",
      getAnalyzingSystemPrompt: () => "analyze prompt\n",
      getFormatGuardSystemPrompt: () => "guard",
      client: { chat: { completions: { create } } }
    });

    const out = await processor.buildFinalText("extracted text");

    expect(out).toBe("final text");
    expect(create).toHaveBeenCalledWith({
      model: "custom/model",
      messages: [
        { role: "system", content: "analyze prompt" },
        { role: "user", content: "extracted text" }
      ],
      max_tokens: 4096,
      temperature: 0.15
    });
  });

  it("calls chat completions with the format guard prompt and final text", async () => {
    const create = vi.fn(async () => ({
      choices: [{ message: { content: " guarded final " } }]
    }));
    const processor = new OpenAICompatibleTextProcessor({
      apiKey: "test-key",
      model: "custom/model",
      getExtractPromptText: () => "extract",
      getAnalyzingSystemPrompt: () => "analyze",
      getFormatGuardSystemPrompt: () => "guard prompt\n",
      client: { chat: { completions: { create } } }
    });

    const out = await processor.guardFinalText("final text");

    expect(out).toBe("guarded final");
    expect(create).toHaveBeenCalledWith({
      model: "custom/model",
      messages: [
        { role: "system", content: "guard prompt" },
        { role: "user", content: "final text" }
      ],
      max_tokens: 4096,
      temperature: 0
    });
  });
});
