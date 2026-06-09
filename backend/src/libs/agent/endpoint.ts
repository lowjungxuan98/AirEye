import { GENAI_HEALTH_PATH, WORKFLOW_RUN_PATH } from "./constants";

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

export function buildWorkflowRunUrl(baseUrl: string): string {
  return joinUrl(baseUrl, WORKFLOW_RUN_PATH);
}

export function buildGenaiHealthUrl(baseUrl: string): string {
  return joinUrl(baseUrl, GENAI_HEALTH_PATH);
}
