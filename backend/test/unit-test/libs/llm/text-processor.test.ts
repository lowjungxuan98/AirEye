import { describe, expect, it, vi } from "vitest";
import { OpenAICompatibleTextProcessor } from "../../../../src/libs/llm/text-processor";

describe("OpenAICompatibleTextProcessor", () => {
  it("extractTextFromImageWithPrompt forwards prompt text and a data URL image", async () => {
    const create = vi.fn(async () => ({
      choices: [{ message: { content: " extracted text \n" } }]
    }));
    const processor = new OpenAICompatibleTextProcessor({
      apiKey: "test-key",
      model: "openrouter/free",
      baseURL: "https://openrouter.ai/api/v1",
      client: { chat: { completions: { create } } }
    });

    const out = await processor.extractTextFromImageWithPrompt(
      Buffer.from([1, 2, 3]),
      "image/jpg",
      "instruction line\n"
    );

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
      client: { chat: { completions: { create } } }
    });

    await expect(
      processor.extractTextFromImageWithPrompt(Buffer.from("img"), "image/png", "instruction")
    ).resolves.toBe("a\nb");
  });

  it("buildFinalTextWithPrompt sends per-call system prompt and the extracted text", async () => {
    const create = vi.fn(async () => ({
      choices: [{ message: { content: " final text " } }]
    }));
    const processor = new OpenAICompatibleTextProcessor({
      apiKey: "test-key",
      model: "custom/model",
      client: { chat: { completions: { create } } }
    });

    const out = await processor.buildFinalTextWithPrompt("extracted text", "analyze prompt\n");

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

  it("guardFinalText sends per-call format-guard prompt and the final text", async () => {
    const create = vi.fn(async () => ({
      choices: [{ message: { content: " guarded final " } }]
    }));
    const processor = new OpenAICompatibleTextProcessor({
      apiKey: "test-key",
      model: "custom/model",
      client: { chat: { completions: { create } } }
    });

    const out = await processor.guardFinalText("final text", "guard prompt\n");

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

  it("analyzeQuestionTypeFromImageUrl sends prompt + image with deterministic settings", async () => {
    const create = vi.fn(async () => ({
      choices: [{ message: { content: "MCQ-Single" }, finish_reason: "stop" }]
    }));
    const processor = new OpenAICompatibleTextProcessor({
      apiKey: "test-key",
      model: "deepseek-image",
      client: { chat: { completions: { create } } }
    });

    const out = await processor.analyzeQuestionTypeFromImageUrl(
      "https://example.test/image.png",
      "classify the image\n"
    );

    expect(out).toEqual({ raw: "MCQ-Single", finishReason: "stop", reasoning: null });
    expect(create).toHaveBeenCalledWith({
      model: "deepseek-image",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "classify the image" },
            { type: "image_url", image_url: { url: "https://example.test/image.png" } }
          ]
        }
      ],
      extra_body: { thinking: { type: "disabled" } },
      max_tokens: 8192,
      temperature: 0
    });
  });

  it("analyzeQuestionTypeFromImageUrl returns null finishReason and null reasoning when fields are missing", async () => {
    const create = vi.fn(async () => ({ choices: [{ message: { content: "" } }] }));
    const processor = new OpenAICompatibleTextProcessor({
      apiKey: "test-key",
      model: "deepseek-image",
      client: { chat: { completions: { create } } }
    });

    await expect(
      processor.analyzeQuestionTypeFromImageUrl("https://example.test/i.png", "prompt")
    ).resolves.toEqual({ raw: "", finishReason: null, reasoning: null });
  });

  it("analyzeQuestionTypeFromImageUrl surfaces reasoning_content when the provider exposes it", async () => {
    const create = vi.fn(async () => ({
      choices: [
        {
          message: {
            content: "",
            reasoning_content: "I think this looks like an MCQ-Single  "
          },
          finish_reason: "length"
        }
      ]
    }));
    const processor = new OpenAICompatibleTextProcessor({
      apiKey: "test-key",
      model: "glm-image",
      client: { chat: { completions: { create } } }
    });

    await expect(
      processor.analyzeQuestionTypeFromImageUrl("https://example.test/i.png", "prompt")
    ).resolves.toEqual({
      raw: "",
      finishReason: "length",
      reasoning: "I think this looks like an MCQ-Single"
    });
  });
});
