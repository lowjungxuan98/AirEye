import type { NextFunction, Request, Response } from "express";
import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createRouter, wrapAsync } from "../../../../src/libs/utils/http.util";

describe("wrapAsync", () => {
  it("forwards rejected promises to next", async () => {
    const next = vi.fn<NextFunction>();
    const boom = new Error("boom");
    const handler = vi.fn(async () => {
      throw boom;
    });
    wrapAsync(handler as Parameters<typeof wrapAsync>[0])({} as Request, {} as Response, next);
    await vi.waitFor(() => expect(next).toHaveBeenCalledWith(boom));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does not call next when the handler resolves", async () => {
    const next = vi.fn<NextFunction>();
    const handler = vi.fn(async () => undefined);
    wrapAsync(handler as Parameters<typeof wrapAsync>[0])({} as Request, {} as Response, next);
    await Promise.resolve();
    expect(next).not.toHaveBeenCalled();
  });
});

describe("createRouter", () => {
  it("registers route definitions and wraps async handlers", async () => {
    const app = express();
    app.use(
      createRouter([
        {
          method: "get",
          path: "/ok",
          handlers: [
            async (_req, res) => {
              res.status(200).json({ ok: true });
            }
          ]
        }
      ])
    );

    await request(app).get("/ok").expect(200, { ok: true });
  });

  it("forwards rejected route handlers to Express error handling", async () => {
    const app = express();
    app.use(
      createRouter([
        {
          method: "get",
          path: "/boom",
          handlers: [
            async () => {
              throw new Error("boom");
            }
          ]
        }
      ])
    );
    app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      res.status(500).json({ message: err instanceof Error ? err.message : "unknown" });
    });

    await request(app).get("/boom").expect(500, { message: "boom" });
  });
});
