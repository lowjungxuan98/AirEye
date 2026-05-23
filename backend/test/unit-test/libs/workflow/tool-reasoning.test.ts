import { describe, expect, it, vi } from "vitest";
import { ToolReasoning } from "../../../../src/libs/workflow/tool-reasoning";

describe("ToolReasoning", () => {
  it("plans workflow steps from a Langfuse prompt and vision model JSON", async () => {
    const langfuse = {
      getPrompt: vi.fn(async () => ({ text: "Plan the workflow", version: 1, labels: [] }))
    };
    const litellm = {
      runVisionStep: vi.fn(async () =>
        [
          "```json",
          '{"steps":[{"prompt":"vision-step","model":"image"},{"prompt":"formatted-result","model":"reasoning"}]}',
          "```"
        ].join("\n")
      )
    };
    const planner = new ToolReasoning({
      langfuse,
      litellm,
      label: "production"
    } as never);

    await expect(planner.decideSteps("openai", "https://img.example.test/upl.jpg")).resolves.toEqual([
      { prompt: "vision-step", model: "image" },
      { prompt: "formatted-result", model: "reasoning" }
    ]);
    expect(langfuse.getPrompt).toHaveBeenCalledWith("tool-reasoning", { label: "production" });
    expect(litellm.runVisionStep).toHaveBeenCalledWith({
      provider: "openai",
      imageUrl: "https://img.example.test/upl.jpg",
      prompt: "Plan the workflow"
    });
  });

  it("rejects empty workflow plans", async () => {
    const planner = new ToolReasoning({
      langfuse: {
        getPrompt: vi.fn(async () => ({ text: "Plan the workflow", version: 1, labels: [] }))
      },
      litellm: {
        runVisionStep: vi.fn(async () => '{"steps":[]}')
      }
    } as never);

    await expect(planner.decideSteps("openai", "https://img.example.test/upl.jpg")).rejects.toMatchObject({
      code: "INVALID_REQUEST"
    });
  });
});
