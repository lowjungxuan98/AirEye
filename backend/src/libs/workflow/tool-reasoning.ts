import { internalError, invalidRequest } from "../utils/api-error.util";
import type { LangfuseClient } from "../langfuse/client";
import type { LiteLlmClient } from "../litellm/client";
import type { LlmProvider } from "../configs/env.config";
import {
  DEFAULT_TOOL_REASONING_PROMPT_NAME,
  STEP_MODEL_IMAGE,
  STEP_MODEL_REASONING
} from "./constants";
import type { ToolReasoningOptions, WorkflowStep } from "./type";

export type { WorkflowStep, StepModel, ToolReasoningOptions } from "./type";

export class ToolReasoning {
  private readonly langfuse: LangfuseClient;
  private readonly litellm: Pick<LiteLlmClient, "runVisionStep">;
  private readonly toolPromptName: string;
  private readonly label: string | undefined;

  constructor(options: ToolReasoningOptions) {
    this.langfuse = options.langfuse;
    this.litellm = options.litellm;
    this.toolPromptName = options.toolPromptName ?? DEFAULT_TOOL_REASONING_PROMPT_NAME;
    this.label = options.label;
  }

  async decideSteps(provider: LlmProvider, imageUrl: string): Promise<WorkflowStep[]> {
    const prompt = await this.langfuse.getPrompt(this.toolPromptName, { label: this.label });
    const raw = await this.litellm.runVisionStep({
      provider,
      imageUrl,
      prompt: prompt.text
    });
    return parseSteps(raw);
  }
}

function parseSteps(raw: string): WorkflowStep[] {
  const jsonCandidate = stripFences(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonCandidate);
  } catch {
    throw internalError(`tool-reasoning did not return JSON: ${raw.slice(0, 200)}`);
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw invalidRequest("tool-reasoning JSON must be an object");
  }
  const stepsValue = (parsed as { steps?: unknown }).steps;
  if (!Array.isArray(stepsValue) || stepsValue.length === 0) {
    throw invalidRequest("tool-reasoning JSON must contain a non-empty `steps` array");
  }

  return stepsValue.map((entry, index) => {
    if (typeof entry !== "object" || entry === null) {
      throw invalidRequest(`tool-reasoning step ${index} is not an object`);
    }
    const step = entry as { prompt?: unknown; model?: unknown };
    if (typeof step.prompt !== "string" || step.prompt.trim().length === 0) {
      throw invalidRequest(`tool-reasoning step ${index} missing string \`prompt\``);
    }
    if (step.model !== STEP_MODEL_IMAGE && step.model !== STEP_MODEL_REASONING) {
      throw invalidRequest(
        `tool-reasoning step ${index} \`model\` must be "image" or "reasoning"`
      );
    }
    return { prompt: step.prompt.trim(), model: step.model };
  });
}

function stripFences(raw: string): string {
  const trimmed = raw.trim();
  const fenced = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i.exec(trimmed);
  return fenced ? fenced[1]!.trim() : trimmed;
}
