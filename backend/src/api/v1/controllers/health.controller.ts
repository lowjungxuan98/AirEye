import type { Request, Response } from "express";
import type { HealthReport } from "../model/health.model";

export function createHealthHandler(runHealthChecks: () => Promise<HealthReport>) {
  return async (_req: Request, res: Response) => {
    const report = await runHealthChecks();
    res.status(report.ok ? 200 : 503).json(report);
  };
}
