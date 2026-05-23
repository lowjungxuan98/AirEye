import { describe, expect, it, vi } from "vitest";
import { StepExecutor } from "../../../../src/libs/workflow/step-executor";
import type { WorkflowStep } from "../../../../src/libs/workflow/type";

describe("StepExecutor", () => {
  it("runs vision and reasoning steps while caching prompt bodies", async () => {
    const langfuse = {
      getPrompt: vi.fn(async (name: string) => ({
        text: `prompt:${name}`,
        version: 1,
        labels: []
      }))
    };
    const litellm = {
      runVisionStep: vi.fn(async () => "vision output"),
      runReasoningStep: vi.fn(async ({ input }: { input: string }) => `reasoned:${input}`)
    };
    const executor = new StepExecutor({ langfuse, litellm, label: "production" } as never);
    const steps: WorkflowStep[] = [
      { prompt: "vision-step", model: "image" },
      { prompt: "formatted-result", model: "reasoning" },
      { prompt: "formatted-result", model: "reasoning" }
    ];
    const onStepStart = vi.fn();
    const onStepEnd = vi.fn();

    await expect(
      executor.run({
        provider: "openai",
        imageUrl: "https://img.example.test/upl.jpg",
        steps,
        onStepStart,
        onStepEnd
      })
    ).resolves.toEqual([
      "vision output",
      "reasoned:vision output",
      "reasoned:reasoned:vision output"
    ]);

    expect(langfuse.getPrompt).toHaveBeenCalledTimes(2);
    expect(langfuse.getPrompt).toHaveBeenNthCalledWith(1, "vision-step", { label: "production" });
    expect(langfuse.getPrompt).toHaveBeenNthCalledWith(2, "formatted-result", { label: "production" });
    expect(litellm.runVisionStep).toHaveBeenCalledWith({
      provider: "openai",
      imageUrl: "https://img.example.test/upl.jpg",
      prompt: "prompt:vision-step"
    });
    expect(litellm.runReasoningStep).toHaveBeenNthCalledWith(1, {
      provider: "openai",
      input: "vision output",
      prompt: "prompt:formatted-result"
    });
    expect(onStepStart).toHaveBeenCalledTimes(3);
    expect(onStepEnd).toHaveBeenCalledTimes(3);
  });

  it("rejects reasoning as the first workflow step", async () => {
    const executor = new StepExecutor({
      langfuse: {
        getPrompt: vi.fn(async () => ({ text: "prompt", version: 1, labels: [] }))
      },
      litellm: {
        runVisionStep: vi.fn(),
        runReasoningStep: vi.fn()
      }
    } as never);

    await expect(
      executor.run({
        provider: "openai",
        imageUrl: "https://img.example.test/upl.jpg",
        steps: [{ prompt: "formatted-result", model: "reasoning" }]
      })
    ).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  });
});
