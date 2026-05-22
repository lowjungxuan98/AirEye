import type {
  FinalTextBuilder,
  FinalTextFormatGuard,
  ImageTextExtractor,
  QuestionTypeAnalyzer
} from "../../api/v1/model/services.model";
import type { QuestionFlow, QuestionTypeCode } from "../../api/v1/model/import.model";
import type { LlmProvider } from "../configs/env.config";
import { parseLlmProvider } from "../configs/env.config";
import { invalidProvider, providerNotConfigured, unrecognizedQuestionType } from "./api-error.util";
import {
  OpenAICompatibleTextProcessor,
  type OpenAICompatibleChatClient
} from "../llm/text-processor";

export type ProviderState = {
  current_provide: LlmProvider;
};

export interface ProviderStateRepository {
  getProviderState(): Promise<ProviderState | null>;
  setProviderState(state: ProviderState): Promise<void>;
}

export type ProviderOrchestratorOptions = {
  client: OpenAICompatibleChatClient;
  getAvailableProviders: () => Promise<LlmProvider[]>;
  stateRepository: ProviderStateRepository;
  getAnalyzeQuestionPrompt: () => string;
  getMcqExtractTextPrompt: () => string;
  getMcqFinalTextPrompt: () => string;
  getTaskExtractTextPrompt: () => string;
  getTaskFinalTextPrompt: () => string;
  getFormatGuardPrompt: () => string;
};

const SUPPORTED_QUESTION_TYPE_CODES: readonly QuestionTypeCode[] = [
  "Task",
  "MCQ-Single",
  "MCQ-Multiple"
];

export class ProviderOrchestrator
  implements QuestionTypeAnalyzer, ImageTextExtractor, FinalTextBuilder, FinalTextFormatGuard
{
  private readonly client: OpenAICompatibleChatClient;
  private readonly loadAvailableProviders: () => Promise<LlmProvider[]>;
  private readonly stateRepository: ProviderStateRepository;
  private readonly getAnalyzeQuestionPrompt: () => string;
  private readonly getMcqExtractTextPrompt: () => string;
  private readonly getMcqFinalTextPrompt: () => string;
  private readonly getTaskExtractTextPrompt: () => string;
  private readonly getTaskFinalTextPrompt: () => string;
  private readonly getFormatGuardPrompt: () => string;

  constructor(options: ProviderOrchestratorOptions) {
    this.client = options.client;
    this.loadAvailableProviders = options.getAvailableProviders;
    this.stateRepository = options.stateRepository;
    this.getAnalyzeQuestionPrompt = options.getAnalyzeQuestionPrompt;
    this.getMcqExtractTextPrompt = options.getMcqExtractTextPrompt;
    this.getMcqFinalTextPrompt = options.getMcqFinalTextPrompt;
    this.getTaskExtractTextPrompt = options.getTaskExtractTextPrompt;
    this.getTaskFinalTextPrompt = options.getTaskFinalTextPrompt;
    this.getFormatGuardPrompt = options.getFormatGuardPrompt;
  }

  async getAvailableProviders(): Promise<LlmProvider[]> {
    return this.loadAvailableProviders();
  }

  async getCurrentProvider(): Promise<LlmProvider> {
    const state = await this.stateRepository.getProviderState();
    if (state) {
      return parseLlmProvider(state.current_provide);
    }
    return this.resolveCurrentProvider(await this.getAvailableProviders());
  }

  private async resolveCurrentProvider(availableProviders: LlmProvider[]): Promise<LlmProvider> {
    const state = await this.stateRepository.getProviderState();
    if (!state) {
      const provider = availableProviders[0];
      if (!provider) {
        throw providerNotConfigured("no LiteLLM providers discovered");
      }
      await this.stateRepository.setProviderState({ current_provide: provider });
      return provider;
    }
    const currentProvider = parseLlmProvider(state.current_provide);
    if (!availableProviders.includes(currentProvider)) {
      throw providerNotConfigured(currentProvider);
    }
    return currentProvider;
  }

  async setCurrentProvider(provider: LlmProvider): Promise<ProviderState> {
    const normalizedProvider = parseLlmProvider(provider);
    const availableProviders = await this.getAvailableProviders();
    if (!availableProviders.includes(normalizedProvider)) {
      throw invalidProvider(`Provider is not configured: ${provider}`);
    }
    const state = { current_provide: normalizedProvider };
    await this.stateRepository.setProviderState(state);
    return state;
  }

  async getSnapshot(): Promise<ProviderState & { available_providers: LlmProvider[] }> {
    const availableProviders = await this.getAvailableProviders();
    return {
      current_provide: await this.resolveCurrentProvider(availableProviders),
      available_providers: availableProviders
    };
  }

  async analyzeQuestionTypeFromImageUrl(imageUrl: string): Promise<QuestionTypeCode> {
    const provider = await this.getCurrentProvider();
    const model = `${provider}-image`;
    const reply = await this.processor(provider, "image").analyzeQuestionTypeFromImageUrl(
      imageUrl,
      this.getAnalyzeQuestionPrompt()
    );
    return parseQuestionTypeCode(reply.raw, {
      provider,
      model,
      finishReason: reply.finishReason,
      reasoning: reply.reasoning
    });
  }

  async extractTextFromImageUrl(imageUrl: string, flow: QuestionFlow): Promise<string> {
    const provider = await this.getCurrentProvider();
    const prompt = flow === "Task" ? this.getTaskExtractTextPrompt() : this.getMcqExtractTextPrompt();
    return this.processor(provider, "image").extractTextFromImageUrlWithPrompt(imageUrl, prompt);
  }

  async buildFinalText(extractedText: string, flow: QuestionFlow): Promise<string> {
    const provider = await this.getCurrentProvider();
    const prompt = flow === "Task" ? this.getTaskFinalTextPrompt() : this.getMcqFinalTextPrompt();
    return this.processor(provider, "reasoning").buildFinalTextWithPrompt(extractedText, prompt);
  }

  async guardFinalText(finalText: string): Promise<string> {
    const provider = await this.getCurrentProvider();
    return this.processor(provider, "reasoning").guardFinalText(
      finalText,
      this.getFormatGuardPrompt()
    );
  }

  private processor(provider: LlmProvider, stage: "image" | "reasoning"): OpenAICompatibleTextProcessor {
    return new OpenAICompatibleTextProcessor({
      model: `${provider}-${stage}`,
      client: this.client
    });
  }
}

export function parseProvider(value: unknown): LlmProvider | null {
  if (typeof value !== "string") {
    return null;
  }
  try {
    return parseLlmProvider(value);
  } catch {
    return null;
  }
}

function parseQuestionTypeCode(
  raw: string,
  context: { provider: string; model: string; finishReason: string | null; reasoning: string | null }
): QuestionTypeCode {
  const stripped = stripWrappingFenceOrQuotes(raw.trim());
  for (const code of SUPPORTED_QUESTION_TYPE_CODES) {
    if (stripped === code) {
      return code;
    }
  }
  // Recover from a reasoning trace: thinking-mode models sometimes hit the token
  // limit mid-thought after already committing to a label; the chosen code is
  // usually still embedded in the trace.
  if (context.reasoning) {
    for (const code of SUPPORTED_QUESTION_TYPE_CODES) {
      if (context.reasoning.includes(code)) {
        return code;
      }
    }
  }
  throw unrecognizedQuestionType({ ...context, raw, stripped });
}

function stripWrappingFenceOrQuotes(value: string): string {
  let next = value.trim();
  const fenceMatch = /^```[a-zA-Z0-9_-]*\s*\n([\s\S]*?)\n?```$/.exec(next);
  if (fenceMatch) {
    next = fenceMatch[1]!.trim();
  }
  if (
    (next.startsWith('"') && next.endsWith('"') && next.length >= 2) ||
    (next.startsWith("'") && next.endsWith("'") && next.length >= 2)
  ) {
    next = next.slice(1, -1).trim();
  }
  return next;
}
