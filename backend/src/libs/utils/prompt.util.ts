import fs from "node:fs";
import path from "node:path";
import {
  API_ERROR_MESSAGES,
  invalidRequest,
  promptFieldMustBeString
} from "./api-error.util";

export type PromptBundle = {
  analyzeQuestionPrompt: string;
  mcqExtractTextPrompt: string;
  mcqFinalTextPrompt: string;
  taskExtractTextPrompt: string;
  taskFinalTextPrompt: string;
  formatGuardPrompt: string;
};

export type PromptUpdateBody = Partial<PromptBundle>;

type PromptKey = keyof PromptBundle;

const PROMPT_FILENAMES: Record<PromptKey, string> = {
  analyzeQuestionPrompt: "analyze_question_prompt.txt",
  mcqExtractTextPrompt: "extract_text_prompt.txt",
  mcqFinalTextPrompt: "analyzing_text_prompt.txt",
  taskExtractTextPrompt: "task_extract_text_prompt.txt",
  taskFinalTextPrompt: "task_final_text_prompt.txt",
  formatGuardPrompt: "format_guard_prompt.txt"
};

const PROMPT_KEYS: readonly PromptKey[] = Object.keys(PROMPT_FILENAMES) as PromptKey[];

export class GrimPromptSettings {
  private readonly paths: Record<PromptKey, string>;
  private readonly values: Record<PromptKey, string> = {
    analyzeQuestionPrompt: "",
    mcqExtractTextPrompt: "",
    mcqFinalTextPrompt: "",
    taskExtractTextPrompt: "",
    taskFinalTextPrompt: "",
    formatGuardPrompt: ""
  };

  private constructor(paths: Record<PromptKey, string>) {
    this.paths = paths;
    this.reloadFromDisk();
  }

  static loadFromDirectory(promptsDir: string): GrimPromptSettings {
    const paths = {} as Record<PromptKey, string>;
    for (const key of PROMPT_KEYS) {
      paths[key] = path.join(promptsDir, PROMPT_FILENAMES[key]);
    }
    return new GrimPromptSettings(paths);
  }

  reloadFromDisk(): void {
    try {
      for (const key of PROMPT_KEYS) {
        this.values[key] = fs.readFileSync(this.paths[key], "utf8");
      }
    } catch (error) {
      const hint = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to read prompt files: ${hint}`);
    }
  }

  getSnapshot(): PromptBundle {
    return {
      analyzeQuestionPrompt: this.values.analyzeQuestionPrompt,
      mcqExtractTextPrompt: this.values.mcqExtractTextPrompt,
      mcqFinalTextPrompt: this.values.mcqFinalTextPrompt,
      taskExtractTextPrompt: this.values.taskExtractTextPrompt,
      taskFinalTextPrompt: this.values.taskFinalTextPrompt,
      formatGuardPrompt: this.values.formatGuardPrompt
    };
  }

  getAnalyzeQuestionPrompt(): string {
    return this.values.analyzeQuestionPrompt;
  }

  getMcqExtractTextPrompt(): string {
    return this.values.mcqExtractTextPrompt;
  }

  getMcqFinalTextPrompt(): string {
    return this.values.mcqFinalTextPrompt;
  }

  getTaskExtractTextPrompt(): string {
    return this.values.taskExtractTextPrompt;
  }

  getTaskFinalTextPrompt(): string {
    return this.values.taskFinalTextPrompt;
  }

  getFormatGuardPrompt(): string {
    return this.values.formatGuardPrompt;
  }

  updatePrompts(body: PromptUpdateBody): void {
    const provided = PROMPT_KEYS.filter((key) => body[key] !== undefined);
    if (provided.length === 0) {
      throw invalidRequest(API_ERROR_MESSAGES.missingPromptUpdate);
    }

    for (const key of provided) {
      const value = body[key];
      if (typeof value !== "string") {
        throw promptFieldMustBeString(key);
      }
      fs.writeFileSync(this.paths[key], value, "utf8");
      this.values[key] = value;
    }
  }
}
