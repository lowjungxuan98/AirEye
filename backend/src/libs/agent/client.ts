import { internalError } from "../utils/api-error.util";
import type {
  WorkflowRunInput,
  WorkflowRunResult,
  WorkflowRunner
} from "../../api/v1/model/services.model";
import { AGENT_API_KEY_HEADER, DEFAULT_AGENT_TIMEOUT_MS } from "./constants";
import { buildWorkflowRunUrl } from "./endpoint";
import type { AgentWorkflowClientOptions, AgentWorkflowRunResponse } from "./type";

/**
 * HTTP client for the isolated Python genai service (LangGraph + LangChain +
 * LlamaIndex). Implements the `WorkflowRunner` port so it drops into
 * `ImportService` in place of the in-process ToolReasoning + StepExecutor engine.
 */
export class AgentWorkflowClient implements WorkflowRunner {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: AgentWorkflowClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_AGENT_TIMEOUT_MS;
  }

  async run(input: WorkflowRunInput): Promise<WorkflowRunResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await this.fetchImpl(buildWorkflowRunUrl(this.baseUrl), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          [AGENT_API_KEY_HEADER]: this.apiKey
        },
        body: JSON.stringify({
          provider: input.provider,
          imageUrl: input.imageUrl,
          kind: input.kind ?? "import"
        }),
        signal: controller.signal
      });
    } catch (error) {
      throw internalError(`genai workflow request failed: ${errorText(error)}`);
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw internalError(`genai workflow failed with HTTP ${response.status}`);
    }

    const body = (await response.json()) as AgentWorkflowRunResponse;
    return {
      extractedText: asString(body.extractedText),
      finalText: asString(body.finalText),
      steps: parseSteps(body.steps)
    };
  }
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseSteps(value: unknown): WorkflowRunResult["steps"] {
  if (!Array.isArray(value)) return undefined;
  const steps: NonNullable<WorkflowRunResult["steps"]> = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) continue;
    const { prompt, model } = entry as { prompt?: unknown; model?: unknown };
    if (typeof prompt !== "string") continue;
    if (model !== "image" && model !== "reasoning") continue;
    steps.push({ prompt, model });
  }
  return steps.length > 0 ? steps : undefined;
}

function errorText(error: unknown): string {
  if (error instanceof Error) {
    return error.name === "AbortError" ? "request timed out" : error.message;
  }
  return "unknown error";
}
