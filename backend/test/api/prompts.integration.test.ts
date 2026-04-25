import request from "supertest";
import { describe, expect, it } from "vitest";
import { buildTestApp } from "../test-utils";

describe("GET /api/v1/prompts", () => {
  it("returns both prompt strings", async () => {
    const app = buildTestApp({
      initialExtractPrompt: "e1",
      initialAnalyzingPrompt: "a1",
      initialFormatGuardPrompt: "g1"
    });
    const res = await request(app).get("/api/v1/prompts").expect(200);
    expect(res.body).toEqual({
      extractTextPrompt: "e1",
      analyzingTextPrompt: "a1",
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
    expect(res.body.extractTextPrompt).toBe("x");
  });
});

describe("PUT /api/v1/prompts", () => {
  it("overwrites prompts on disk and returns the new snapshot (JSON)", async () => {
    const app = buildTestApp({
      initialExtractPrompt: "old-e",
      initialAnalyzingPrompt: "old-a",
      initialFormatGuardPrompt: "old-g"
    });
    const res = await request(app)
      .put("/api/v1/prompts")
      .send({
        extractTextPrompt: "new-e",
        analyzingTextPrompt: "new-a",
        formatGuardPrompt: "new-g"
      })
      .expect(200);
    expect(res.body).toEqual({
      extractTextPrompt: "new-e",
      analyzingTextPrompt: "new-a",
      formatGuardPrompt: "new-g"
    });

    const again = await request(app).get("/api/v1/prompts").expect(200);
    expect(again.body).toEqual(res.body);
  });

  it("accepts multipart/form-data with extract_text, analyzing_text, and format_guard file parts", async () => {
    const app = buildTestApp({
      initialExtractPrompt: "old-e",
      initialAnalyzingPrompt: "old-a",
      initialFormatGuardPrompt: "old-g"
    });
    const res = await request(app)
      .put("/api/v1/prompts")
      .attach("extract_text", Buffer.from("from-file-e", "utf8"), {
        filename: "extract_text_prompt.txt",
        contentType: "text/plain"
      })
      .attach("analyzing_text", Buffer.from("from-file-a", "utf8"), {
        filename: "analyzing_text_prompt.txt",
        contentType: "text/plain"
      })
      .attach("format_guard", Buffer.from("from-file-g", "utf8"), {
        filename: "format_guard_prompt.txt",
        contentType: "text/plain"
      })
      .expect(200);
    expect(res.body.extractTextPrompt).toBe("from-file-e");
    expect(res.body.analyzingTextPrompt).toBe("from-file-a");
    expect(res.body.formatGuardPrompt).toBe("from-file-g");
  });

  it("accepts multipart text fields extract_text / analyzing_text / format_guard without files", async () => {
    const app = buildTestApp({
      initialExtractPrompt: "x",
      initialAnalyzingPrompt: "y",
      initialFormatGuardPrompt: "z"
    });
    const res = await request(app)
      .put("/api/v1/prompts")
      .field("extract_text", "only-extract")
      .field("format_guard", "only-guard")
      .expect(200);
    expect(res.body.extractTextPrompt).toBe("only-extract");
    expect(res.body.analyzingTextPrompt).toBe("y");
    expect(res.body.formatGuardPrompt).toBe("only-guard");
  });

  it("returns 400 when body omits both fields", async () => {
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
    await request(app).put("/api/v1/prompts").send({ extractTextPrompt: "z" }).expect(401);
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
