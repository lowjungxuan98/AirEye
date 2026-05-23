import type { LangfuseClient } from "../langfuse/client";
import type { LiteLlmClient } from "../litellm/client";
import type { LlmProvider } from "../configs/env.config";

export type StepModel = "image" | "reasoning";

export type WorkflowStep = {
  prompt: string;
  model: StepModel;
};

export type ToolReasoningOptions = {
  langfuse: LangfuseClient;
  litellm: Pick<LiteLlmClient, "runVisionStep">;
  /** Langfuse prompt name (default `tool-reasoning`). */
  toolPromptName?: string;
  /** Optional Langfuse label override (else uses langfuse client default). */
  label?: string;
};

export type StepExecutorOptions = {
  langfuse: LangfuseClient;
  litellm: Pick<LiteLlmClient, "runVisionStep" | "runReasoningStep">;
  /** Optional Langfuse label override (else uses langfuse client default). */
  label?: string;
};

export type StepExecutorRunInput = {
  provider: LlmProvider;
  imageUrl: string;
  steps: WorkflowStep[];
  onStepStart?: (index: number, step: WorkflowStep) => void;
  onStepEnd?: (index: number, output: string) => void;
};
