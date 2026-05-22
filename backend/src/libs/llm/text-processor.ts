import OpenAI from "openai";

type OpenAICompatibleMessage =
  | { role: "system"; content: string }
  | {
      role: "user";
      content:
        | string
        | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;
    };

type OpenAICompatibleChatResponse = {
  choices?: Array<{
    message?: { content?: unknown; reasoning_content?: unknown; reasoning?: unknown };
    finish_reason?: unknown;
  }>;
};

export type ClassifierReply = {
  raw: string;
  finishReason: string | null;
  /** Reasoning trace if the provider exposes it (DeepSeek-R1, GLM-5 thinking, Qwen-QwQ). */
  reasoning: string | null;
};

export type OpenAICompatibleChatClient = {
  chat: {
    completions: {
      create(input: {
        model: string;
        messages: OpenAICompatibleMessage[];
        max_tokens: number;
        temperature: number;
        /**
         * LiteLLM passthrough for provider-specific parameters. Anything inside
         * `extra_body` is forwarded verbatim to the underlying provider (e.g.
         * `{ thinking: { type: "disabled" } }` for ZhipuAI GLM models). LiteLLM's
         * `openai` provider validator otherwise rejects unknown top-level fields.
         */
        extra_body?: Record<string, unknown>;
      }): Promise<OpenAICompatibleChatResponse>;
    };
  };
};

type OpenAICompatibleTextProcessorBaseOptions = {
  model: string;
};

export type OpenAICompatibleTextProcessorOptions = OpenAICompatibleTextProcessorBaseOptions &
  (
    | {
        apiKey: string;
        baseURL?: string;
        client?: OpenAICompatibleChatClient;
      }
    | {
        apiKey?: string;
        baseURL?: string;
        client: OpenAICompatibleChatClient;
      }
  );

export class OpenAICompatibleTextProcessor {
  private readonly client: OpenAICompatibleChatClient;
  readonly model: string;

  constructor(options: OpenAICompatibleTextProcessorOptions) {
    this.model = options.model;
    if (options.client) {
      this.client = options.client;
      return;
    }

    this.client = new OpenAI({
      apiKey: options.apiKey,
      ...(options.baseURL ? { baseURL: options.baseURL } : {})
    });
  }

  async analyzeQuestionTypeFromImageUrl(imageUrl: string, prompt: string): Promise<ClassifierReply> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt.trimEnd() },
            { type: "image_url", image_url: { url: imageUrl } }
          ]
        }
      ],
      // The classifier needs a single-label answer, not chain-of-thought. We disable
      // thinking mode for providers that support it (GLM-5V-Turbo defaults to thinking,
      // which causes finish_reason=length with raw="" no matter how high max_tokens is).
      // The param is sent under `extra_body` so LiteLLM forwards it to the underlying
      // provider instead of rejecting it as a non-OpenAI top-level field. Providers
      // that don't recognize `thinking` ignore it.
      extra_body: { thinking: { type: "disabled" } },
      // Generous fallback budget: if a provider DOES still do reasoning (or ignores the
      // thinking toggle), make sure visible content has room. Single-label output is
      // tiny so the actual cost stays trivial.
      max_tokens: 8192,
      temperature: 0
    });

    const choice = response.choices?.[0];
    const reasoning =
      pickReasoning(choice?.message?.reasoning_content) ??
      pickReasoning(choice?.message?.reasoning) ??
      null;
    return {
      raw: normalizeAssistantContent(choice?.message?.content),
      finishReason: typeof choice?.finish_reason === "string" ? choice.finish_reason : null,
      reasoning
    };
  }

  async extractTextFromImageWithPrompt(
    imageBuffer: Buffer,
    imageMimeType: string,
    prompt: string
  ): Promise<string> {
    const imageBase64 = imageBuffer.toString("base64");
    const dataUrl = `data:${normalizeImageMimeType(imageMimeType)};base64,${imageBase64}`;
    return this.extractTextFromImageUrlWithPrompt(dataUrl, prompt);
  }

  async extractTextFromImageUrlWithPrompt(imageUrl: string, prompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt.trimEnd() },
            { type: "image_url", image_url: { url: imageUrl } }
          ]
        }
      ],
      max_tokens: 4096,
      temperature: 0.15
    });

    return normalizeAssistantContent(response.choices?.[0]?.message?.content);
  }

  async buildFinalTextWithPrompt(extractedText: string, systemPrompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt.trimEnd() },
        {
          role: "user",
          content: extractedText
        }
      ],
      max_tokens: 4096,
      temperature: 0.15
    });

    return normalizeAssistantContent(response.choices?.[0]?.message?.content);
  }

  async guardFinalText(finalText: string, systemPrompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt.trimEnd() },
        {
          role: "user",
          content: finalText
        }
      ],
      max_tokens: 4096,
      temperature: 0
    });

    return normalizeAssistantContent(response.choices?.[0]?.message?.content);
  }
}

function pickReasoning(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeImageMimeType(imageMimeType: string): string {
  const mimeType = imageMimeType.toLowerCase();
  return mimeType === "image/jpg" ? "image/jpeg" : mimeType;
}

function normalizeAssistantContent(content: unknown): string {
  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }
        if (typeof part !== "object" || part === null) {
          return "";
        }
        const text = (part as { text?: unknown }).text;
        return typeof text === "string" ? text : "";
      })
      .join("\n")
      .trim();
  }

  return "";
}
