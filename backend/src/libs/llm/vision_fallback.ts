// Temporary shim — remove this file when DeepSeek's API exposes vision.
// Routes the EXTRACT (image) step through another provider when the active
// provider can't accept image_url content parts; leaves FINAL/GUARD alone.
// While this is in place, image-extraction calls under DeepSeek bill OpenAI.

import type { LlmProvider } from "../configs/env.config";
import type { OpenAICompatibleTextProcessor } from "./text-processor";

type ProcessorPair = {
  extract: OpenAICompatibleTextProcessor;
  final: OpenAICompatibleTextProcessor;
};

const VISION_FALLBACK_BY_PROVIDER: Partial<Record<LlmProvider, LlmProvider>> = {
  deepseek: "openai"
};

export function applyVisionFallback(
  processors: Map<LlmProvider, ProcessorPair>,
  logger: Pick<Console, "warn"> = console
): void {
  for (const [from, to] of Object.entries(VISION_FALLBACK_BY_PROVIDER) as Array<
    [LlmProvider, LlmProvider]
  >) {
    const source = processors.get(from);
    const target = processors.get(to);
    if (!source) continue;
    if (!target) {
      logger.warn(
        `[vision-fallback] ${from} is configured but fallback target ${to} is not; image extraction on ${from} will fail.`
      );
      continue;
    }
    source.extract = target.extract;
  }
}
