import { invalidRequest } from "../utils/api-error.util";
import type { LangfuseClient } from "../langfuse/client";
import type { LiteLlmClient } from "../litellm/client";
import { STEP_MODEL_IMAGE } from "./constants";
import type { StepExecutorOptions, StepExecutorRunInput } from "./type";

export type { StepExecutorOptions, StepExecutorRunInput } from "./type";

export class StepExecutor {
  private readonly langfuse: LangfuseClient;
  private readonly litellm: Pick<LiteLlmClient, "runVisionStep" | "runReasoningStep">;
  private readonly label: string | undefined;

  constructor(options: StepExecutorOptions) {
    this.langfuse = options.langfuse;
    this.litellm = options.litellm;
    this.label = options.label;
  }

  async run({
    provider,
    imageUrl,
    steps,
    onStepStart,
    onStepEnd
  }: StepExecutorRunInput): Promise<string[]> {
    const outputs: string[] = [];
    const promptCache = new Map<string, string>();

    for (let index = 0; index < steps.length; index += 1) {
      const step = steps[index]!;
      onStepStart?.(index, step);

      const promptText = await this.loadPrompt(step.prompt, promptCache);

      let output: string;
      if (step.model === STEP_MODEL_IMAGE) {
        output = await this.litellm.runVisionStep({ provider, imageUrl, prompt: promptText });
      } else {
        if (index === 0) {
          throw invalidRequest(
            "tool-reasoning step 0 cannot use model `reasoning` — needs prior image output"
          );
        }
        const previousOutput = outputs[index - 1]!;
        output = await this.litellm.runReasoningStep({
          provider,
          input: previousOutput,
          prompt: promptText
        });
      }

      outputs.push(output);
      onStepEnd?.(index, output);
    }

    return outputs;
  }

  private async loadPrompt(name: string, cache: Map<string, string>): Promise<string> {
    const cached = cache.get(name);
    if (cached !== undefined) return cached;
    const fetched = await this.langfuse.getPrompt(name, { label: this.label });
    cache.set(name, fetched.text);
    return fetched.text;
  }
}
