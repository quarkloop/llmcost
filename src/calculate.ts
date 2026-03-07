import { MODEL_MAP, MODELS, type ModelPricing, type Provider } from "./models";

// ── Types ────────────────────────────────────────────────────────────────────

export interface TokenUsage {
  /** Number of input / prompt tokens */
  inputTokens: number;
  /** Number of output / completion tokens */
  outputTokens: number;
  /** Number of cached input tokens read (reduces cost if supported) */
  cachedTokens?: number;
}

export interface CostResult {
  /** Model identifier used for calculation */
  model: string;
  /** Provider name */
  provider: Provider;
  /** Human-readable model display name */
  displayName: string;
  /** Total cost in USD */
  totalCost: number;
  /** Breakdown of costs */
  breakdown: {
    inputCost: number;
    outputCost: number;
    cachedCost: number;
  };
  /** Token usage echoed back */
  usage: Required<TokenUsage>;
}

export interface CompareResult {
  model: string;
  provider: Provider;
  displayName: string;
  totalCost: number;
  breakdown: CostResult["breakdown"];
}

export interface CalculateOptions {
  /** Whether to apply a 50% batch API discount (both OpenAI and Anthropic support this) */
  batch?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const MTOK = 1_000_000;

function round(value: number, decimals = 8): number {
  return Math.round(value * 10 ** decimals) / 10 ** decimals;
}

function computeCost(
  pricing: ModelPricing,
  usage: Required<TokenUsage>,
  batch: boolean
): CostResult["breakdown"] & { total: number } {
  const multiplier = batch ? 0.5 : 1.0;

  // Cached tokens: use cachedInputPricePerMToken if available, otherwise fall back to inputPricePerMToken
  const cachedRate =
    pricing.cachedInputPricePerMToken ?? pricing.inputPricePerMToken;

  // Non-cached input tokens = total input - cached
  const nonCachedInput = Math.max(0, usage.inputTokens - usage.cachedTokens);

  const inputCost = round(
    (nonCachedInput / MTOK) * pricing.inputPricePerMToken * multiplier
  );
  const outputCost = round(
    (usage.outputTokens / MTOK) * pricing.outputPricePerMToken * multiplier
  );
  const cachedCost = round(
    (usage.cachedTokens / MTOK) * cachedRate * multiplier
  );
  const total = round(inputCost + outputCost + cachedCost);

  return { inputCost, outputCost, cachedCost, total };
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Calculate the cost for a single model given token usage.
 *
 * @example
 * ```ts
 * const result = calculate("claude-sonnet-4-6", { inputTokens: 1000, outputTokens: 500 });
 * console.log(result.totalCost); // USD
 * ```
 */
export function calculate(
  model: string,
  usage: TokenUsage,
  options: CalculateOptions = {}
): CostResult {
  const pricing = MODEL_MAP.get(model);
  if (!pricing) {
    throw new Error(
      `Unknown model: "${model}". Use listModels() to see supported models.`
    );
  }

  const normalizedUsage: Required<TokenUsage> = {
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    cachedTokens: usage.cachedTokens ?? 0,
  };

  const { inputCost, outputCost, cachedCost, total } = computeCost(
    pricing,
    normalizedUsage,
    options.batch ?? false
  );

  return {
    model: pricing.model,
    provider: pricing.provider,
    displayName: pricing.displayName,
    totalCost: total,
    breakdown: { inputCost, outputCost, cachedCost },
    usage: normalizedUsage,
  };
}

/**
 * Compare the cost of the same token usage across multiple models (or all models).
 * Results are sorted by totalCost ascending (cheapest first).
 *
 * @example
 * ```ts
 * const results = compare({ inputTokens: 10000, outputTokens: 2000 });
 * console.log(results[0].model); // cheapest model
 * ```
 */
export function compare(
  usage: TokenUsage,
  models?: string[],
  options: CalculateOptions = {}
): CompareResult[] {
  const targetModels = models
    ? models.map((m) => {
        const p = MODEL_MAP.get(m);
        if (!p) throw new Error(`Unknown model: "${m}". Use listModels() to see supported models.`);
        return p;
      })
    : MODELS;

  return targetModels
    .map((pricing) => {
      const normalizedUsage: Required<TokenUsage> = {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cachedTokens: usage.cachedTokens ?? 0,
      };
      const { inputCost, outputCost, cachedCost, total } = computeCost(
        pricing,
        normalizedUsage,
        options.batch ?? false
      );
      return {
        model: pricing.model,
        provider: pricing.provider,
        displayName: pricing.displayName,
        totalCost: total,
        breakdown: { inputCost, outputCost, cachedCost },
      };
    })
    .sort((a, b) => a.totalCost - b.totalCost);
}

/**
 * Get the pricing details for a specific model.
 *
 * @example
 * ```ts
 * const pricing = getModelPricing("gpt-4o");
 * console.log(pricing.inputPricePerMToken); // 2.5
 * ```
 */
export function getModelPricing(model: string): ModelPricing {
  const pricing = MODEL_MAP.get(model);
  if (!pricing) {
    throw new Error(
      `Unknown model: "${model}". Use listModels() to see supported models.`
    );
  }
  return pricing;
}

/**
 * List all supported models, optionally filtered by provider.
 *
 * @example
 * ```ts
 * const anthropicModels = listModels("anthropic");
 * ```
 */
export function listModels(provider?: Provider): ModelPricing[] {
  return provider ? MODELS.filter((m) => m.provider === provider) : [...MODELS];
}

/**
 * Format a USD cost value into a human-readable string.
 *
 * @example
 * ```ts
 * formatCost(0.00123456); // "$0.001235"
 * formatCost(1.5);        // "$1.5000"
 * ```
 */
export function formatCost(usd: number, decimals = 6): string {
  return `$${usd.toFixed(decimals)}`;
}
