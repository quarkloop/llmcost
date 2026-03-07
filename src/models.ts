import modelPricesRaw from "./model_prices.json";

// ── Raw tokencost JSON schema ────────────────────────────────────────────────

export interface RawModelEntry {
  max_tokens?: number;
  max_input_tokens?: number;
  max_output_tokens?: number;
  input_cost_per_token?: number;
  output_cost_per_token?: number;
  input_cost_per_token_batches?: number;
  output_cost_per_token_batches?: number;
  input_cost_per_token_batch_requests?: number;
  cache_read_input_token_cost?: number;
  cache_creation_input_token_cost?: number;
  input_cost_per_token_cache_hit?: number;
  output_cost_per_reasoning_token?: number;
  deprecation_date?: string;
  litellm_provider?: string;
  mode?: string;
  supports_function_calling?: boolean;
  supports_vision?: boolean;
  supports_prompt_caching?: boolean;
  supports_reasoning?: boolean;
  supports_system_messages?: boolean;
  supports_response_schema?: boolean;
  [key: string]: unknown;
}

export type RawPriceDatabase = Record<string, RawModelEntry>;

// ── Normalised ModelPricing ──────────────────────────────────────────────────

export interface ModelPricing {
  /** Model identifier as used in API calls */
  model: string;
  /** LiteLLM / tokencost provider string (e.g. "openai", "anthropic") */
  provider: string;
  /** Interaction mode: chat | completion | embedding | image | audio | etc. */
  mode: string;
  /** Cost per single input token in USD */
  inputCostPerToken: number;
  /** Cost per single output token in USD */
  outputCostPerToken: number;
  /** Cost per single input token when using batch API (if supported) */
  batchInputCostPerToken?: number;
  /** Cost per single output token when using batch API (if supported) */
  batchOutputCostPerToken?: number;
  /** Cost per cached input token read (prompt caching, if supported) */
  cacheReadCostPerToken?: number;
  /** Cost per token written into cache (if supported) */
  cacheWriteCostPerToken?: number;
  /** Cost per reasoning/thinking output token (o1/o3/extended thinking) */
  reasoningCostPerToken?: number;
  /** Max total tokens */
  maxTokens?: number;
  /** Max input context window tokens */
  maxInputTokens?: number;
  /** Max output tokens */
  maxOutputTokens?: number;
  /** ISO date string when this model is/was deprecated */
  deprecationDate?: string;
  /** Whether this model supports prompt caching */
  supportsPromptCaching: boolean;
  /** Whether this model supports function/tool calling */
  supportsFunctionCalling: boolean;
  /** Whether this model supports vision/image input */
  supportsVision: boolean;
  /** Whether this model supports extended reasoning */
  supportsReasoning: boolean;
}

// ── Normalise raw entry → ModelPricing ──────────────────────────────────────

function normalise(model: string, raw: RawModelEntry): ModelPricing {
  return {
    model,
    provider: raw.litellm_provider ?? "unknown",
    mode: raw.mode ?? "chat",
    inputCostPerToken: raw.input_cost_per_token ?? 0,
    outputCostPerToken: raw.output_cost_per_token ?? 0,
    batchInputCostPerToken:
      raw.input_cost_per_token_batches ?? raw.input_cost_per_token_batch_requests,
    batchOutputCostPerToken: raw.output_cost_per_token_batches,
    cacheReadCostPerToken:
      raw.cache_read_input_token_cost ?? raw.input_cost_per_token_cache_hit,
    cacheWriteCostPerToken: raw.cache_creation_input_token_cost,
    reasoningCostPerToken: raw.output_cost_per_reasoning_token,
    maxTokens: raw.max_tokens,
    maxInputTokens: raw.max_input_tokens,
    maxOutputTokens: raw.max_output_tokens,
    deprecationDate: raw.deprecation_date,
    supportsPromptCaching: raw.supports_prompt_caching ?? false,
    supportsFunctionCalling: raw.supports_function_calling ?? false,
    supportsVision: raw.supports_vision ?? false,
    supportsReasoning: raw.supports_reasoning ?? false,
  };
}

// ── In-memory registry ───────────────────────────────────────────────────────

const _raw = modelPricesRaw as RawPriceDatabase;

/** Full normalised model map — keyed by model string */
export const MODEL_MAP: Map<string, ModelPricing> = new Map(
  Object.entries(_raw).map(([k, v]) => [k, normalise(k, v)])
);

/** All normalised models as an array */
export const MODELS: ModelPricing[] = Array.from(MODEL_MAP.values());

/**
 * Merge additional or overridden pricing entries into the registry.
 * Useful for custom models or corrected prices.
 */
export function registerModels(entries: Record<string, RawModelEntry>): void {
  for (const [model, raw] of Object.entries(entries)) {
    MODEL_MAP.set(model, normalise(model, raw));
  }
}
