import request from "supertest";
import { describe, expect, it } from "vitest";
import { buildTestApp } from "../test-utils";

describe("GET /api/v1/provider", () => {
  it("returns the current provider state", async () => {
    const app = buildTestApp();

    const res = await request(app).get("/api/v1/provider").expect(200);

    expect(res.body).toEqual({
      current_provide: "openrouter",
      available_providers: ["openrouter", "openai", "nvidia_nim"]
    });
  });
});

describe("PUT /api/v1/provider", () => {
  it("switches the current provider", async () => {
    const app = buildTestApp();

    const res = await request(app)
      .put("/api/v1/provider")
      .send({ current_provide: "nvidia_nim" })
      .expect(200);

    expect(res.body.current_provide).toBe("nvidia_nim");

    const again = await request(app).get("/api/v1/provider").expect(200);
    expect(again.body.current_provide).toBe("nvidia_nim");
  });

  it("accepts provider as a body alias", async () => {
    const app = buildTestApp();

    const res = await request(app).put("/api/v1/provider").send({ provider: "openai" }).expect(200);

    expect(res.body.current_provide).toBe("openai");
  });

  it("returns 400 for an unknown provider", async () => {
    const app = buildTestApp();

    const res = await request(app).put("/api/v1/provider").send({ provider: "other" }).expect(400);

    expect(res.body.error.code).toBe("INVALID_PROVIDER");
  });
});
