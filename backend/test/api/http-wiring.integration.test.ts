import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { buildTestApp } from "../test-utils";

describe("HTTP wiring (integration)", () => {
  it("responds 404 for an unknown route", async () => {
    const app = buildTestApp();
    await request(app).get("/api/v1/does-not-exist").expect(404);
  });

  it("applies CORS headers and 204 for OPTIONS /openapi.yaml", async () => {
    const app = buildTestApp();
    const res = await request(app).options("/openapi.yaml").expect(204);
    expect(res.headers["access-control-allow-origin"]).toBe("*");
    expect(res.headers["access-control-allow-methods"]).toContain("GET");
  });

  it("serves openapi.yaml with a YAML content type when the file exists", async () => {
    const app = buildTestApp();
    const res = await request(app).get("/openapi.yaml").expect(200);
    expect(String(res.headers["content-type"])).toMatch(/yaml/);
    expect(res.text.length).toBeGreaterThan(0);
  });

  it("wires POST /api/v1/send-notification to the send notification service", async () => {
    const sendNotificationService = { sendNotification: vi.fn(async () => {}) };
    const app = buildTestApp({ sendNotificationService });

    await request(app).post("/api/v1/send-notification").expect(200, { ok: true });

    expect(sendNotificationService.sendNotification).toHaveBeenCalledOnce();
  });

  it("does not mount the old POST /api/v1/capture route", async () => {
    const sendNotificationService = { sendNotification: vi.fn(async () => {}) };
    const app = buildTestApp({ sendNotificationService });

    await request(app).post("/api/v1/capture").expect(404);

    expect(sendNotificationService.sendNotification).not.toHaveBeenCalled();
  });
});
