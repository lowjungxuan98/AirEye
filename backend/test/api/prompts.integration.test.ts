import request from "supertest";
import { describe, expect, it } from "vitest";
import { buildTestApp } from "../test-utils";

describe("GET /api/v1/prompts", () => {
  it("returns all six prompt strings", async () => {
    const app = buildTestApp({
      initialAnalyzeQuestionPrompt: "aq",
      initialExtractPrompt: "e1",
      initialAnalyzingPrompt: "a1",
      initialTaskExtractPrompt: "tex",
      initialTaskFinalPrompt: "tfi",
      initialFormatGuardPrompt: "g1"
    });
    const res = await request(app).get("/api/v1/prompts").expect(200);
    expect(res.body).toEqual({
      analyzeQuestionPrompt: "aq",
      mcqExtractTextPrompt: "e1",
      mcqFinalTextPrompt: "a1",
      taskExtractTextPrompt: "tex",
      taskFinalTextPrompt: "tfi",
      formatGuardPrompt: "g1"
    });
  });

  it("returns 401 when admin secret is configured and header is missing", async () => {
    const app = buildTestApp({ promptAdminSecret: "s3cret" });
    const res = await request(app).get("/api/v1/prompts").expect(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("succeeds when admin secret header matches", async () => {
    const app = buildTestApp({
      promptAdminSecret: "s3cret",
      initialExtractPrompt: "x"
    });
    const res = await request(app)
      .get("/api/v1/prompts")
      .set("X-Grim-Prompt-Secret", "s3cret")
      .expect(200);
    expect(res.body.mcqExtractTextPrompt).toBe("x");
  });
});

describe("PUT /api/v1/prompts", () => {
  it("overwrites all six prompts on disk and returns the new snapshot (JSON)", async () => {
    const app = buildTestApp({
      initialAnalyzeQuestionPrompt: "old-aq",
      initialExtractPrompt: "old-e",
      initialAnalyzingPrompt: "old-a",
      initialTaskExtractPrompt: "old-tex",
      initialTaskFinalPrompt: "old-tfi",
      initialFormatGuardPrompt: "old-g"
    });
    const res = await request(app)
      .put("/api/v1/prompts")
      .send({
        analyzeQuestionPrompt: "new-aq",
        mcqExtractTextPrompt: "new-e",
        mcqFinalTextPrompt: "new-a",
        taskExtractTextPrompt: "new-tex",
        taskFinalTextPrompt: "new-tfi",
        formatGuardPrompt: "new-g"
      })
      .expect(200);
    expect(res.body).toEqual({
      analyzeQuestionPrompt: "new-aq",
      mcqExtractTextPrompt: "new-e",
      mcqFinalTextPrompt: "new-a",
      taskExtractTextPrompt: "new-tex",
      taskFinalTextPrompt: "new-tfi",
      formatGuardPrompt: "new-g"
    });

    const again = await request(app).get("/api/v1/prompts").expect(200);
    expect(again.body).toEqual(res.body);
  });

  it("accepts multipart/form-data with all six file parts", async () => {
    const app = buildTestApp({
      initialAnalyzeQuestionPrompt: "old-aq",
      initialExtractPrompt: "old-e",
      initialAnalyzingPrompt: "old-a",
      initialTaskExtractPrompt: "old-tex",
      initialTaskFinalPrompt: "old-tfi",
      initialFormatGuardPrompt: "old-g"
    });
    const res = await request(app)
      .put("/api/v1/prompts")
      .attach("analyze_question", Buffer.from("from-file-aq", "utf8"), {
        filename: "analyze_question_prompt.txt",
        contentType: "text/plain"
      })
      .attach("extract_text", Buffer.from("from-file-e", "utf8"), {
        filename: "extract_text_prompt.txt",
        contentType: "text/plain"
      })
      .attach("analyzing_text", Buffer.from("from-file-a", "utf8"), {
        filename: "analyzing_text_prompt.txt",
        contentType: "text/plain"
      })
      .attach("task_extract_text", Buffer.from("from-file-tex", "utf8"), {
        filename: "task_extract_text_prompt.txt",
        contentType: "text/plain"
      })
      .attach("task_final_text", Buffer.from("from-file-tfi", "utf8"), {
        filename: "task_final_text_prompt.txt",
        contentType: "text/plain"
      })
      .attach("format_guard", Buffer.from("from-file-g", "utf8"), {
        filename: "format_guard_prompt.txt",
        contentType: "text/plain"
      })
      .expect(200);
    expect(res.body).toEqual({
      analyzeQuestionPrompt: "from-file-aq",
      mcqExtractTextPrompt: "from-file-e",
      mcqFinalTextPrompt: "from-file-a",
      taskExtractTextPrompt: "from-file-tex",
      taskFinalTextPrompt: "from-file-tfi",
      formatGuardPrompt: "from-file-g"
    });
  });

  it("accepts multipart text fields without files (subset update)", async () => {
    const app = buildTestApp({
      initialAnalyzeQuestionPrompt: "aq",
      initialExtractPrompt: "x",
      initialAnalyzingPrompt: "y",
      initialTaskExtractPrompt: "tex",
      initialTaskFinalPrompt: "tfi",
      initialFormatGuardPrompt: "z"
    });
    const res = await request(app)
      .put("/api/v1/prompts")
      .field("analyze_question", "only-aq")
      .field("task_extract_text", "only-tex")
      .field("format_guard", "only-guard")
      .expect(200);
    expect(res.body.analyzeQuestionPrompt).toBe("only-aq");
    expect(res.body.mcqExtractTextPrompt).toBe("x");
    expect(res.body.mcqFinalTextPrompt).toBe("y");
    expect(res.body.taskExtractTextPrompt).toBe("only-tex");
    expect(res.body.taskFinalTextPrompt).toBe("tfi");
    expect(res.body.formatGuardPrompt).toBe("only-guard");
  });

  it("returns 400 when body omits all fields", async () => {
    const app = buildTestApp();
    const res = await request(app).put("/api/v1/prompts").send({}).expect(400);
    expect(res.body.error.code).toBe("INVALID_REQUEST");
  });

  it("returns 400 for multipart with no prompt parts", async () => {
    const app = buildTestApp();
    const boundary = "testboundary123";
    await request(app)
      .put("/api/v1/prompts")
      .set("Content-Type", `multipart/form-data; boundary=${boundary}`)
      .send(`--${boundary}--\r\n`)
      .expect(400);
  });

  it("returns 401 without secret when prompt admin is enabled", async () => {
    const app = buildTestApp({ promptAdminSecret: "x" });
    await request(app).put("/api/v1/prompts").send({ mcqExtractTextPrompt: "z" }).expect(401);
  });

  it("returns 415 when a prompt file is not text-friendly", async () => {
    const app = buildTestApp();
    const res = await request(app)
      .put("/api/v1/prompts")
      .attach("extract_text", Buffer.from("%PDF-1.4"), {
        filename: "x.pdf",
        contentType: "application/pdf"
      })
      .expect(415);
    expect(res.body.error.code).toBe("UNSUPPORTED_FILE_TYPE");
  });
});
