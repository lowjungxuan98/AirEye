import OpenAI from "openai";
import type {
  FinalTextBuilder,
  FinalTextFormatGuard,
  ImageTextExtractor
} from "../../api/v1/model/services.model";

type OpenAICompatibleMessage =
  | { role: "system"; content: string }
  | {
      role: "user";
      content:
        | string
        | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;
    };

type OpenAICompatibleChatResponse = {
  choices?: Array<{ message?: { content?: unknown } }>;
};

type OpenAICompatibleChatClient = {
  chat: {
    completions: {
      create(input: {
        model: string;
        messages: OpenAICompatibleMessage[];
        max_tokens: number;
        temperature: number;
      }): Promise<OpenAICompatibleChatResponse>;
    };
  };
};

export type OpenAICompatibleTextProcessorOptions = {
  apiKey: string;
  model: string;
  baseURL?: string;
  getExtractPromptText: () => string;
  getAnalyzingSystemPrompt: () => string;
  getFormatGuardSystemPrompt: () => string;
  enableWebSearchInAnalyze?: boolean;
  client?: OpenAICompatibleChatClient;
};

export class OpenAICompatibleTextProcessor implements ImageTextExtractor, FinalTextBuilder, FinalTextFormatGuard {
  private readonly client: OpenAICompatibleChatClient;
  private readonly model: string;
  private readonly getExtractPromptText: () => string;
  private readonly getAnalyzingSystemPrompt: () => string;
  private readonly getFormatGuardSystemPrompt: () => string;
  private readonly enableWebSearchInAnalyze: boolean;

  constructor(options: OpenAICompatibleTextProcessorOptions) {
    this.model = options.model;
    this.getExtractPromptText = options.getExtractPromptText;
    this.getAnalyzingSystemPrompt = options.getAnalyzingSystemPrompt;
    this.getFormatGuardSystemPrompt = options.getFormatGuardSystemPrompt;
    this.enableWebSearchInAnalyze = Boolean(options.enableWebSearchInAnalyze);
    this.client =
      options.client ??
      new OpenAI({
        apiKey: options.apiKey,
        ...(options.baseURL ? { baseURL: options.baseURL } : {})
      });
  }

  async extractTextFromImage(imageBuffer: Buffer, imageMimeType: string): Promise<string> {
    const imageBase64 = imageBuffer.toString("base64");
    const dataUrl = `data:${normalizeImageMimeType(imageMimeType)};base64,${imageBase64}`;
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: this.getExtractPromptText().trimEnd() },
            { type: "image_url", image_url: { url: dataUrl } }
          ]
        }
      ],
      max_tokens: 4096,
      temperature: 0.15
    });

    return normalizeAssistantContent(response.choices?.[0]?.message?.content);
  }

  async buildFinalText(extractedText: string): Promise<string> {
    if (this.enableWebSearchInAnalyze) {
      const out = await this.tryResponsesWebSearch(extractedText);
      if (out !== null) {
        return out;
      }
    }

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: this.getAnalyzingSystemPrompt().trimEnd() },
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

  async guardFinalText(finalText: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: this.getFormatGuardSystemPrompt().trimEnd() },
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

  private async tryResponsesWebSearch(extractedText: string): Promise<string | null> {
    const anyClient = this.client as any;
    if (!anyClient?.responses?.create) {
      return null;
    }

    const system = this.getAnalyzingSystemPrompt().trimEnd();
    const response = await anyClient.responses.create({
      model: this.model,
      tools: [{ type: "web_search_preview" }],
      input: [
        { role: "system", content: system },
        { role: "user", content: extractedText }
      ]
    });

    const text = typeof response?.output_text === "string" ? response.output_text : "";
    return text.trim() ? text.trim() : null;
  }
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
