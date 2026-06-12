import { createRouter } from "../../../libs/utils/http.util";
import { createHealthHandler } from "../controllers/health.controller";
import type { HealthReport } from "../model/health.model";

export function createHealthRouter(runHealthChecks: () => Promise<HealthReport>) {
  return createRouter([
    { method: "get", path: "/health", handlers: [createHealthHandler(runHealthChecks)] }
  ]);
}
