import request from "supertest";
import { describe, expect, it } from "vitest";
import { buildTestApp, stableDegradedHealth, stableOkHealth } from "../test-utils";

describe("GET /health (HTTP integration)", () => {
  it("returns 200 and a health report when checks pass", async () => {
    const app = buildTestApp({
      runHealthChecks: async () => stableOkHealth()
    });
    const res = await request(app).get("/health").expect(200);
    expect(res.body).toMatchObject({
      version: expect.any(String),
      ok: true,
      firebase: { ok: true, latencyMs: expect.any(Number) },
      llm: { ok: true, latencyMs: expect.any(Number) },
      s3: { ok: true, latencyMs: expect.any(Number) }
    });
  });

  it("returns 503 when any dependency is unhealthy", async () => {
    const app = buildTestApp({
      runHealthChecks: async () =>
        stableDegradedHealth({
          firebase: { ok: false, latencyMs: 1, error: "unavailable" }
        })
    });
    const res = await request(app).get("/health").expect(503);
    expect(res.body).toMatchObject({ ok: false, firebase: { ok: false } });
    expect(res.body.firebase.error).toBeDefined();
  });
});
