import fs from "node:fs";
import path from "node:path";
import { ApiError } from "./api-error.util";

export type PromptBundle = {
  extractTextPrompt: string;
  analyzingTextPrompt: string;
  formatGuardPrompt: string;
};

export type PromptUpdateBody = Partial<{
  extractTextPrompt: string;
  analyzingTextPrompt: string;
  formatGuardPrompt: string;
}>;

export class GrimPromptSettings {
  private extractTextPrompt = "";
  private analyzingTextPrompt = "";
  private formatGuardPrompt = "";

  private constructor(
    private readonly extractPath: string,
    private readonly analyzingPath: string,
    private readonly formatGuardPath: string
  ) {
    this.reloadFromDisk();
  }

  /**
   * Loads `extract_text_prompt.txt`, `analyzing_text_prompt.txt`, and
   * `format_guard_prompt.txt` from `promptsDir`.
   */
  static loadFromDirectory(promptsDir: string): GrimPromptSettings {
    const extractPath = path.join(promptsDir, "extract_text_prompt.txt");
    const analyzingPath = path.join(promptsDir, "analyzing_text_prompt.txt");
    const formatGuardPath = path.join(promptsDir, "format_guard_prompt.txt");
    return new GrimPromptSettings(extractPath, analyzingPath, formatGuardPath);
  }

  reloadFromDisk(): void {
    try {
      this.extractTextPrompt = fs.readFileSync(this.extractPath, "utf8");
      this.analyzingTextPrompt = fs.readFileSync(this.analyzingPath, "utf8");
      this.formatGuardPrompt = fs.readFileSync(this.formatGuardPath, "utf8");
    } catch (error) {
      const hint = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to read prompt files: ${hint}`);
    }
  }

  getSnapshot(): PromptBundle {
    return {
      extractTextPrompt: this.extractTextPrompt,
      analyzingTextPrompt: this.analyzingTextPrompt,
      formatGuardPrompt: this.formatGuardPrompt
    };
  }

  getExtractTextPrompt(): string {
    return this.extractTextPrompt;
  }

  getAnalyzingTextPrompt(): string {
    return this.analyzingTextPrompt;
  }

  getFormatGuardPrompt(): string {
    return this.formatGuardPrompt;
  }

  /**
   * Overwrites one or both prompts on disk and refreshes the in-memory copy.
   */
  updatePrompts(body: PromptUpdateBody): void {
    if (
      body.extractTextPrompt === undefined &&
      body.analyzingTextPrompt === undefined &&
      body.formatGuardPrompt === undefined
    ) {
      throw new ApiError(
        400,
        "INVALID_REQUEST",
        "Provide at least one prompt: JSON keys extractTextPrompt / analyzingTextPrompt / formatGuardPrompt, or multipart fields extract_text / analyzing_text / format_guard (file or text)"
      );
    }

    if (body.extractTextPrompt !== undefined) {
      if (typeof body.extractTextPrompt !== "string") {
        throw new ApiError(400, "INVALID_REQUEST", "extractTextPrompt must be a string");
      }
      fs.writeFileSync(this.extractPath, body.extractTextPrompt, "utf8");
      this.extractTextPrompt = body.extractTextPrompt;
    }

    if (body.analyzingTextPrompt !== undefined) {
      if (typeof body.analyzingTextPrompt !== "string") {
        throw new ApiError(400, "INVALID_REQUEST", "analyzingTextPrompt must be a string");
      }
      fs.writeFileSync(this.analyzingPath, body.analyzingTextPrompt, "utf8");
      this.analyzingTextPrompt = body.analyzingTextPrompt;
    }

    if (body.formatGuardPrompt !== undefined) {
      if (typeof body.formatGuardPrompt !== "string") {
        throw new ApiError(400, "INVALID_REQUEST", "formatGuardPrompt must be a string");
      }
      fs.writeFileSync(this.formatGuardPath, body.formatGuardPrompt, "utf8");
      this.formatGuardPrompt = body.formatGuardPrompt;
    }
  }
}
