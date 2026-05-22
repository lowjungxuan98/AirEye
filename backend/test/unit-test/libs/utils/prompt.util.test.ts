import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { GrimPromptSettings } from "../../../../src/libs/utils/prompt.util";
import { ApiError } from "../../../../src/libs/utils/api-error.util";

describe("GrimPromptSettings (prompt.util)", () => {
  let dir: string;

  afterEach(() => {
    if (dir && fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  function seedAll(): string {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), "grim-prompt-unit-"));
    fs.writeFileSync(path.join(d, "analyze_question_prompt.txt"), "alpha-aq", "utf8");
    fs.writeFileSync(path.join(d, "extract_text_prompt.txt"), "alpha", "utf8");
    fs.writeFileSync(path.join(d, "analyzing_text_prompt.txt"), "beta", "utf8");
    fs.writeFileSync(path.join(d, "task_extract_text_prompt.txt"), "tau-ex", "utf8");
    fs.writeFileSync(path.join(d, "task_final_text_prompt.txt"), "tau-fi", "utf8");
    fs.writeFileSync(path.join(d, "format_guard_prompt.txt"), "delta", "utf8");
    return d;
  }

  it("loads all six prompts from disk and updatePrompts writes one file at a time", () => {
    dir = seedAll();

    const settings = GrimPromptSettings.loadFromDirectory(dir);
    expect(settings.getSnapshot()).toEqual({
      analyzeQuestionPrompt: "alpha-aq",
      mcqExtractTextPrompt: "alpha",
      mcqFinalTextPrompt: "beta",
      taskExtractTextPrompt: "tau-ex",
      taskFinalTextPrompt: "tau-fi",
      formatGuardPrompt: "delta"
    });

    settings.updatePrompts({ mcqExtractTextPrompt: "gamma" });
    expect(fs.readFileSync(path.join(dir, "extract_text_prompt.txt"), "utf8")).toBe("gamma");
    expect(settings.getMcqExtractTextPrompt()).toBe("gamma");
    expect(settings.getMcqFinalTextPrompt()).toBe("beta");
    expect(settings.getFormatGuardPrompt()).toBe("delta");

    settings.updatePrompts({ formatGuardPrompt: "epsilon" });
    expect(fs.readFileSync(path.join(dir, "format_guard_prompt.txt"), "utf8")).toBe("epsilon");
    expect(settings.getFormatGuardPrompt()).toBe("epsilon");

    settings.updatePrompts({ analyzeQuestionPrompt: "zeta-aq" });
    expect(fs.readFileSync(path.join(dir, "analyze_question_prompt.txt"), "utf8")).toBe("zeta-aq");
    expect(settings.getAnalyzeQuestionPrompt()).toBe("zeta-aq");

    settings.updatePrompts({
      taskExtractTextPrompt: "eta-ex",
      taskFinalTextPrompt: "theta-fi"
    });
    expect(fs.readFileSync(path.join(dir, "task_extract_text_prompt.txt"), "utf8")).toBe("eta-ex");
    expect(fs.readFileSync(path.join(dir, "task_final_text_prompt.txt"), "utf8")).toBe("theta-fi");
    expect(settings.getTaskExtractTextPrompt()).toBe("eta-ex");
    expect(settings.getTaskFinalTextPrompt()).toBe("theta-fi");
  });

  it("throws ApiError when update body is empty", () => {
    dir = seedAll();
    const settings = GrimPromptSettings.loadFromDirectory(dir);
    expect(() => settings.updatePrompts({})).toThrow(ApiError);
  });

  it("throws when a provided value is not a string", () => {
    dir = seedAll();
    const settings = GrimPromptSettings.loadFromDirectory(dir);
    // @ts-expect-error — intentional bad type to exercise validation
    expect(() => settings.updatePrompts({ taskExtractTextPrompt: 42 })).toThrow(ApiError);
  });
});
