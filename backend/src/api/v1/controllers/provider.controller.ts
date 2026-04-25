import type { RequestHandler } from "express";
import type { ProviderService } from "../model/services.model";
import { ApiError } from "../../../libs/utils/api-error.util";
import { parseProvider } from "../../../libs/utils/provider_orchestrator.util";

export function createGetProviderHandler(providerService: ProviderService): RequestHandler {
  return async (_req, res) => {
    res.json(await providerService.getSnapshot());
  };
}

export function createPutProviderHandler(providerService: ProviderService): RequestHandler {
  return async (req, res) => {
    const body = req.body as Record<string, unknown> | null;
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      throw new ApiError(400, "INVALID_REQUEST", "Expected a JSON object body");
    }

    const provider = parseProvider(
      body.current_provide ?? body.current_provider ?? body.currentProvider ?? body.provider
    );
    if (!provider) {
      throw new ApiError(
        400,
        "INVALID_PROVIDER",
        "Expected provider to be one of: openrouter, openai, nvidia_nim"
      );
    }

    await providerService.setCurrentProvider(provider);
    res.status(200).json(await providerService.getSnapshot());
  };
}
