import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const promptsDir = path.resolve(__dirname, "../../../prompts");

function readPrompt(name: string): string {
  return fs.readFileSync(path.join(promptsDir, name), "utf8");
}

describe("default prompt templates", () => {
  it("analyze_question prompt emits plain-text Task / MCQ-Single / MCQ-Multiple", () => {
    const prompt = readPrompt("analyze_question_prompt.txt");

    expect(prompt).toContain("Task");
    expect(prompt).toContain("MCQ-Single");
    expect(prompt).toContain("MCQ-Multiple");
    expect(prompt).toMatch(/do not output json/i);
    expect(prompt).toMatch(/do not output markdown/i);
    expect(prompt).toMatch(/do not output code fences/i);
  });

  it("extract_text prompt is MCQ-only, JSON-shaped, no task branch", () => {
    const prompt = readPrompt("extract_text_prompt.txt");

    expect(prompt).toContain('"single"');
    expect(prompt).toContain('"multiple"');
    expect(prompt).toContain("requiredAnswerCount");
    expect(prompt).toContain("Radio buttons imply");
    expect(prompt).toContain("checkboxes imply");
    expect(prompt).not.toContain('"task"');
    expect(prompt).not.toContain("desktopView");
    expect(prompt).not.toContain("formFields");
  });

  it("analyzing_text prompt is MCQ-only HTML answerer with the required headings", () => {
    const prompt = readPrompt("analyzing_text_prompt.txt");

    expect(prompt).toContain("<h2>Question</h2>");
    expect(prompt).toContain("<h2>Options</h2>");
    expect(prompt).toContain("<h2>Answer</h2>");
    expect(prompt).toContain("<h2>Explanation</h2>");
    expect(prompt).toContain("<ul>");
    expect(prompt).toContain("<li>");
    expect(prompt).toMatch(/html fragment/i);
    expect(prompt).not.toContain('"formAnswers"');
    expect(prompt).not.toContain('"steps"');
    expect(prompt).not.toContain("## Question");
  });

  it("task_extract_text prompt is the CKA/task vision extractor", () => {
    const prompt = readPrompt("task_extract_text_prompt.txt");

    expect(prompt).toContain("CKA");
    expect(prompt).toContain("critical_warning");
    expect(prompt).toContain("reduced_score_warning");
    expect(prompt).toContain("ssh_host");
    expect(prompt).toContain("configuration_items");
    expect(prompt).toMatch(/json only/i);
  });

  it("task_final_text prompt produces HTML Task / Steps / Notes, never JSON or Markdown", () => {
    const prompt = readPrompt("task_final_text_prompt.txt");

    expect(prompt).toContain("<h2>Task</h2>");
    expect(prompt).toContain("<h2>Steps</h2>");
    expect(prompt).toContain("<h2>Notes</h2>");
    expect(prompt).toContain("<ol>");
    expect(prompt).toContain('<pre><code class="language-bash">');
    expect(prompt).toMatch(/html fragment/i);
    expect(prompt).toContain("First name = Jung Xuan");
    expect(prompt).toContain("Last name = Low");
    expect(prompt).not.toContain("## Task");
    expect(prompt).not.toContain("## Steps");
  });

  it("format_guard prompt validates HTML, not Markdown or JSON", () => {
    const prompt = readPrompt("format_guard_prompt.txt");

    expect(prompt).toMatch(/html/i);
    expect(prompt).toMatch(/do not return json/i);
    expect(prompt).toMatch(/do not return markdown/i);
    expect(prompt).toContain("<h2>Question</h2>");
    expect(prompt).toContain("<h2>Task</h2>");
    expect(prompt).toContain("<h2>Steps</h2>");
    expect(prompt).toContain("<h2>Notes</h2>");
    expect(prompt).toContain("script");
    expect(prompt).toContain("style");
    expect(prompt).not.toContain('"questions"');
    expect(prompt).not.toContain('"formAnswers"');
  });
});
