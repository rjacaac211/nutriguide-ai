import { logger } from "../logger.js";

// Public OpenAI pricing, point-in-time (verify at https://openai.com/pricing if this
// drifts). Looked up by the model name passed into logTokenUsage() — NOT auto-detected
// from the response, since ChatOpenAI's response_metadata doesn't carry the model name.
// When the model in nodes.ts's `MODEL_NAME` constant changes, add a matching entry here;
// an unlisted model logs a warning and skips cost estimation instead of silently reusing
// a stale price.
const PRICING_PER_1M_TOKENS_USD: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
};

type UsageMetadata = { input_tokens: number; output_tokens: number; total_tokens: number };

export function logTokenUsage(
  nodeName: string,
  message: { usage_metadata?: UsageMetadata } | undefined,
  modelName: string,
  extra?: Record<string, unknown>
) {
  const usage = message?.usage_metadata;
  if (!usage) return;

  const pricing = PRICING_PER_1M_TOKENS_USD[modelName];
  const estimated_cost_usd = pricing
    ? Number(
        ((usage.input_tokens / 1_000_000) * pricing.input + (usage.output_tokens / 1_000_000) * pricing.output).toFixed(6)
      )
    : undefined;

  if (!pricing) {
    logger.warn({ node: nodeName, model: modelName }, "No pricing entry for model — cost estimate skipped");
  }

  logger.info(
    {
      node: nodeName,
      ...extra,
      model: modelName,
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      total_tokens: usage.total_tokens,
      estimated_cost_usd,
    },
    "LLM call token usage"
  );
}
