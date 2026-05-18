import request from "supertest";
import { describe, expect, it } from "vitest";
import { buildTestApp } from "../test-utils";

describe("GET /api/v1/provider", () => {
  it("returns the current provider state", async () => {
    const app = buildTestApp({
      providerCurrent: "alpha",
      providerAvailable: ["alpha", "future-provider"]
    });

    const res = await request(app).get("/api/v1/provider").expect(200);

    expect(res.body).toEqual({
      current_provide: "alpha",
      available_providers: ["alpha", "future-provider"]
    });
  });
});

describe("PUT /api/v1/provider", () => {
  it("switches the current provider", async () => {
    const app = buildTestApp({
      providerCurrent: "alpha",
      providerAvailable: ["alpha", "beta"]
    });

    const res = await request(app)
      .put("/api/v1/provider")
      .send({ current_provide: "beta" })
      .expect(200);

    expect(res.body.current_provide).toBe("beta");

    const again = await request(app).get("/api/v1/provider").expect(200);
    expect(again.body.current_provide).toBe("beta");
  });

  it("accepts provider as a body alias", async () => {
    const app = buildTestApp({
      providerCurrent: "alpha",
      providerAvailable: ["alpha", "future-provider"]
    });

    const res = await request(app)
      .put("/api/v1/provider")
      .send({ provider: "future-provider" })
      .expect(200);

    expect(res.body.current_provide).toBe("future-provider");
  });

  it("continues accepting current_provider as a body alias", async () => {
    const app = buildTestApp({
      providerCurrent: "alpha",
      providerAvailable: ["alpha", "new-route"]
    });

    const res = await request(app)
      .put("/api/v1/provider")
      .send({ current_provider: "new-route" })
      .expect(200);

    expect(res.body.current_provide).toBe("new-route");
  });

  it("returns 400 for an unknown provider", async () => {
    const app = buildTestApp({
      providerCurrent: "alpha",
      providerAvailable: ["alpha"]
    });

    const res = await request(app).put("/api/v1/provider").send({ provider: "other" }).expect(400);

    expect(res.body.error.code).toBe("INVALID_PROVIDER");
  });
});
