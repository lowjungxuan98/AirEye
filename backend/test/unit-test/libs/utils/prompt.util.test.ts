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

  it("loads prompts from disk and updatePrompts writes files", () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "grim-prompt-unit-"));
    fs.writeFileSync(path.join(dir, "extract_text_prompt.txt"), "alpha", "utf8");
    fs.writeFileSync(path.join(dir, "analyzing_text_prompt.txt"), "beta", "utf8");
    fs.writeFileSync(path.join(dir, "format_guard_prompt.txt"), "delta", "utf8");

    const settings = GrimPromptSettings.loadFromDirectory(dir);
    expect(settings.getSnapshot()).toEqual({
      extractTextPrompt: "alpha",
      analyzingTextPrompt: "beta",
      formatGuardPrompt: "delta"
    });

    settings.updatePrompts({ extractTextPrompt: "gamma" });
    expect(fs.readFileSync(path.join(dir, "extract_text_prompt.txt"), "utf8")).toBe("gamma");
    expect(settings.getExtractTextPrompt()).toBe("gamma");
    expect(settings.getAnalyzingTextPrompt()).toBe("beta");
    expect(settings.getFormatGuardPrompt()).toBe("delta");

    settings.updatePrompts({ formatGuardPrompt: "epsilon" });
    expect(fs.readFileSync(path.join(dir, "format_guard_prompt.txt"), "utf8")).toBe("epsilon");
    expect(settings.getFormatGuardPrompt()).toBe("epsilon");
  });

  it("throws ApiError when update body is empty", () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "grim-prompt-unit-"));
    fs.writeFileSync(path.join(dir, "extract_text_prompt.txt"), "a", "utf8");
    fs.writeFileSync(path.join(dir, "analyzing_text_prompt.txt"), "b", "utf8");
    fs.writeFileSync(path.join(dir, "format_guard_prompt.txt"), "c", "utf8");
    const settings = GrimPromptSettings.loadFromDirectory(dir);
    expect(() => settings.updatePrompts({})).toThrow(ApiError);
  });
});
