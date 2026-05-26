import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { AIREYE_API_KEY, API_KEY_HEADER, buildTestApp } from "../test-utils";

describe("PUT /api/v1/auto-analyse", () => {
  it("sets the Firebase auto_analyse flag through the service", async () => {
    const autoAnalyseService = {
      getAutoAnalyseEnabled: vi.fn(async () => true),
      setAutoAnalyseEnabled: vi.fn(async (autoAnalyse: boolean) => ({
        auto_analyse: autoAnalyse
      }))
    };
    const app = buildTestApp({ autoAnalyseService });

    const res = await request(app)
      .put("/api/v1/auto-analyse")
      .set(API_KEY_HEADER, AIREYE_API_KEY)
      .send({ auto_analyse: false })
      .expect(200);

    expect(res.body).toEqual({ auto_analyse: false });
    expect(autoAnalyseService.setAutoAnalyseEnabled).toHaveBeenCalledWith(false);
  });

  it("returns 400 when auto_analyse is not a boolean", async () => {
    const app = buildTestApp();

    const res = await request(app)
      .put("/api/v1/auto-analyse")
      .set(API_KEY_HEADER, AIREYE_API_KEY)
      .send({ auto_analyse: "false" })
      .expect(400);

    expect(res.body).toEqual({
      error: { code: "INVALID_REQUEST", message: "auto_analyse must be a boolean" }
    });
  });
});
