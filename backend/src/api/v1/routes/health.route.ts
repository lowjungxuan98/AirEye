import { Router } from "express";
import { wrapAsync } from "../../../libs/utils/http.util";
import { createHealthHandler } from "../controllers/health.controller";
import type { HealthReport } from "../model/health.model";

export function createHealthRouter(runHealthChecks: () => Promise<HealthReport>): Router {
  const router = Router();
  router.get("/health", wrapAsync(createHealthHandler(runHealthChecks)));
  return router;
}
