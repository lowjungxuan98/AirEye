import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { createHealthHandler } from "../../../../../src/api/v1/controllers/health.controller";
import type { HealthReport } from "../../../../../src/api/v1/model/health.model";

function report(partial: Partial<HealthReport> & Pick<HealthReport, "ok">): HealthReport {
  const dep = { ok: true, latencyMs: 1 };
  return {
    version: partial.version ?? "0.0.0-test",
    ok: partial.ok,
    firebase: partial.firebase ?? dep,
    llm: partial.llm ?? dep,
    s3: partial.s3 ?? dep
  };
}

describe("createHealthHandler", () => {
  it("responds 200 with JSON when report is ok", async () => {
    const body = report({ ok: true });
    const handler = createHealthHandler(async () => body);
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as unknown as Response;
    await handler({} as Request, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(body);
  });

  it("responds 503 when report is not ok", async () => {
    const body = report({
      ok: false,
      firebase: { ok: false, latencyMs: 2, error: "down" }
    });
    const handler = createHealthHandler(async () => body);
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as unknown as Response;
    await handler({} as Request, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(body);
  });
});
