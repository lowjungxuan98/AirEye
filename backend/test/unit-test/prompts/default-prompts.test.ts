import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const promptsDir = path.resolve(__dirname, "../../../prompts");

function readPrompt(name: string): string {
  return fs.readFileSync(path.join(promptsDir, name), "utf8");
}

describe("default prompt templates", () => {
  it("extract prompt supports quizzer single/multiple/task classification without unsupported types", () => {
    const prompt = readPrompt("extract_text_prompt.txt");

    expect(prompt).toContain('"single", "multiple", or "task"');
    expect(prompt).toContain("requiredAnswerCount");
    expect(prompt).toContain("Radio buttons imply");
    expect(prompt).toContain("checkboxes imply");
    expect(prompt).toContain('"desktopView"');
    expect(prompt).toContain("quick references");
    expect(prompt).toContain("host connection instructions");
    expect(prompt).toContain("left instruction sidebar");
    expect(prompt).toContain("warnings, alerts, reminders, notes");
    expect(prompt).toContain("more than one form");
    expect(prompt).toContain("Billing address - First name");
    expect(prompt).not.toMatch(/\bother\b/i);
  });

  it("answer prompt supports MCQ answers and practical task steps", () => {
    const prompt = readPrompt("analyzing_text_prompt.txt");

    expect(prompt).toContain("Use web search and reasoning");
    expect(prompt).toContain("Prefer CLI commands");
    expect(prompt).toContain("First name = Jung Xuan");
    expect(prompt).toContain("Last name = Low");
    expect(prompt).toContain('"steps"');
    expect(prompt).toContain("quick references");
    expect(prompt).toContain("host connection instructions");
    expect(prompt).toContain("exam/task sidebar");
    expect(prompt).toContain("warnings, alerts, reminders, notes");
    expect(prompt).toContain("more than one form");
    expect(prompt).toContain("Billing address - First name");
    expect(prompt).not.toMatch(/\bother\b/i);
  });

  it("format guard accepts only single, multiple, and task final payloads", () => {
    const prompt = readPrompt("format_guard_prompt.txt");

    expect(prompt).toContain('"single", "multiple", or "task"');
    expect(prompt).toContain('"description"');
    expect(prompt).toContain("visible task instructions and references");
    expect(prompt).toContain("sidebar/callout text");
    expect(prompt).toContain("warnings, alerts, reminders, notes");
    expect(prompt).toContain('"formAnswers"');
    expect(prompt).toContain('"Jung Xuan"');
    expect(prompt).toContain('"Low"');
    expect(prompt).toContain("more than one form");
    expect(prompt).toContain("repeated task form field labels");
    expect(prompt).not.toMatch(/\bother\b/i);
  });
});
