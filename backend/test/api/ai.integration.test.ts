import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { AIREYE_API_KEY, API_KEY_HEADER, buildTestApp } from "../test-utils";

describe("PUT /api/v1/ai", () => {
  it("sets the Firebase AI flag through the service", async () => {
    const aiService = {
      getAiEnabled: vi.fn(async () => true),
      setAiEnabled: vi.fn(async (ai: boolean) => ({ ai }))
    };
    const app = buildTestApp({ aiService });

    const res = await request(app)
      .put("/api/v1/ai")
      .set(API_KEY_HEADER, AIREYE_API_KEY)
      .send({ ai: false })
      .expect(200);

    expect(res.body).toEqual({ ai: false });
    expect(aiService.setAiEnabled).toHaveBeenCalledWith(false);
  });

  it("returns 400 when ai is not a boolean", async () => {
    const app = buildTestApp();

    const res = await request(app)
      .put("/api/v1/ai")
      .set(API_KEY_HEADER, AIREYE_API_KEY)
      .send({ ai: "false" })
      .expect(400);

    expect(res.body).toEqual({
      error: { code: "INVALID_REQUEST", message: "ai must be a boolean" }
    });
  });
});
