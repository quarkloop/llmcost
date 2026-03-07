import { MODEL_MAP, MODELS, type ModelPricing } from "./models";

// ── Types ────────────────────────────────────────────────────────────────────

export interface TokenUsage {
  /** Number of input / prompt tokens */
  inputTokens: number;
  /** Number of output / completion tokens */
  outputTokens: number;
  /** Number of cached tokens read from cache */
  cachedReadTokens?: number;
  /** Number of tokens written into cache */
  cachedWriteTokens?: number;
  /** Number of reasoning/thinking tokens (o1, o3, extended thinking) */
  reasoningTokens?: number;
}

export interface CostBreakdown {
  /** Cost of non-cached, non-batch input tokens */
  inputCost: number;
  /** Cost of output tokens */
  outputCost: number;
  /** Cost of cache-read tokens */
  cacheReadCost: number;
  /** Cost of cache-write tokens */
  cacheWriteCost: number;
  /** Cost of reasoning/thinking tokens */
  reasoningCost: number;
}

export interface CostResult {
  model: string;
  provider: string;
  mode: string;
  totalCost: number;
  breakdown: CostBreakdown;
  usage: Required<TokenUsage>;
  /** True if batch pricing was applied */
  isBatch: boolean;
}

export interface CompareResult
  extends Omit<CostResult, "usage" | "isBatch"> {}

// ── Helpers ──────────────────────────────────────────────────────────────────

function round(v: number, dp = 10): number {
  return Math.round(v * 10 ** dp) / 10 ** dp;
}

function computeCost(
  p: ModelPricing,
  usage: Required<TokenUsage>,
  batch: boolean
): { breakdown: CostBreakdown; total: number } {
  const inRate = batch
    ? (p.batchInputCostPerToken ?? p.inputCostPerToken)
    : p.inputCostPerToken;
  const outRate = batch
    ? (p.batchOutputCostPerToken ?? p.outputCostPerToken)
    : p.outputCostPerToken;

  // Non-cached input = total input minus tokens served from cache
  const pureInput = Math.max(
    0,
    usage.inputTokens - usage.cachedReadTokens - usage.cachedWriteTokens
  );

  const inputCost = round(pureInput * inRate);
  const outputCost = round(usage.outputTokens * outRate);
  const cacheReadCost = round(
    usage.cachedReadTokens * (p.cacheReadCostPerToken ?? inRate)
  );
  const cacheWriteCost = round(
    usage.cachedWriteTokens * (p.cacheWriteCostPerToken ?? inRate)
  );
  const reasoningCost = round(
    usage.reasoningTokens * (p.reasoningCostPerToken ?? outRate)
  );

  const total = round(
    inputCost + outputCost + cacheReadCost + cacheWriteCost + reasoningCost
  );

  return {
    breakdown: { inputCost, outputCost, cacheReadCost, cacheWriteCost, reasoningCost },
    total,
  };
}

function normaliseUsage(usage: TokenUsage): Required<TokenUsage> {
  return {
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    cachedReadTokens: usage.cachedReadTokens ?? 0,
    cachedWriteTokens: usage.cachedWriteTokens ?? 0,
    reasoningTokens: usage.reasoningTokens ?? 0,
  };
}

function resolveModel(model: string): ModelPricing {
  const p = MODEL_MAP.get(model);
  if (!p) {
    throw new Error(
      `Unknown model: "${model}". Use listModels() to browse available models.`
    );
  }
  return p;
}

// ── Builder ──────────────────────────────────────────────────────────────────

/**
 * Fluent builder for constructing and executing LLM cost calculations.
 *
 * @example
 * ```ts
 * const result = llmCost()
 *   .model("gpt-4o")
 *   .input(10_000)
 *   .output(2_000)
 *   .cachedRead(5_000)
 *   .batch()
 *   .calculate();
 * ```
 */
export class LlmCostBuilder {
  private _model: string | null = null;
  private _usage: TokenUsage = { inputTokens: 0, outputTokens: 0 };
  private _batch = false;

  /** Set the model to use for calculation */
  model(model: string): this {
    this._model = model;
    return this;
  }

  /** Set the number of input tokens */
  input(tokens: number): this {
    this._usage.inputTokens = tokens;
    return this;
  }

  /** Set the number of output tokens */
  output(tokens: number): this {
    this._usage.outputTokens = tokens;
    return this;
  }

  /** Set the number of cached tokens read from cache */
  cachedRead(tokens: number): this {
    this._usage.cachedReadTokens = tokens;
    return this;
  }

  /** Set the number of tokens written to cache */
  cachedWrite(tokens: number): this {
    this._usage.cachedWriteTokens = tokens;
    return this;
  }

  /** Set the number of reasoning/thinking tokens */
  reasoning(tokens: number): this {
    this._usage.reasoningTokens = tokens;
    return this;
  }

  /** Apply the Batch API 50% discount where available */
  batch(enabled = true): this {
    this._batch = enabled;
    return this;
  }

  /** Provide the full token usage object at once */
  usage(usage: TokenUsage): this {
    this._usage = { ...this._usage, ...usage };
    return this;
  }

  /** Execute the calculation and return a CostResult */
  calculate(): CostResult {
    if (!this._model) {
      throw new Error("Model is required. Call .model('model-name') first.");
    }
    const pricing = resolveModel(this._model);
    const norm = normaliseUsage(this._usage);
    const { breakdown, total } = computeCost(pricing, norm, this._batch);

    return {
      model: pricing.model,
      provider: pricing.provider,
      mode: pricing.mode,
      totalCost: total,
      breakdown,
      usage: norm,
      isBatch: this._batch,
    };
  }

  /**
   * Compare this usage across multiple models (or all models).
   * Returns results sorted by totalCost ascending (cheapest first).
   */
  compare(models?: string[]): CompareResult[] {
    const targets = models
      ? models.map(resolveModel)
      : MODELS;

    const norm = normaliseUsage(this._usage);

    return targets
      .map((pricing) => {
        const { breakdown, total } = computeCost(pricing, norm, this._batch);
        return {
          model: pricing.model,
          provider: pricing.provider,
          mode: pricing.mode,
          totalCost: total,
          breakdown,
        };
      })
      .sort((a, b) => a.totalCost - b.totalCost);
  }
}

// ── Factory ──────────────────────────────────────────────────────────────────

/**
 * Create a new LlmCostBuilder instance.
 *
 * @example
 * ```ts
 * import { llmCost } from 'llmcost';
 *
 * const result = llmCost()
 *   .model("claude-sonnet-4-6")
 *   .input(10_000)
 *   .output(2_000)
 *   .calculate();
 *
 * console.log(result.totalCost); // USD
 * ```
 */
export function llmCost(): LlmCostBuilder {
  return new LlmCostBuilder();
}

// ── Standalone helpers ───────────────────────────────────────────────────────

/**
 * Quick single-call cost calculation without the builder.
 *
 * @example
 * ```ts
 * const result = calculate("gpt-4o", { inputTokens: 1000, outputTokens: 500 });
 * ```
 */
export function calculate(
  model: string,
  usage: TokenUsage,
  options: { batch?: boolean } = {}
): CostResult {
  return llmCost()
    .model(model)
    .usage(usage)
    .batch(options.batch ?? false)
    .calculate();
}

/**
 * Compare a token usage across multiple (or all) models.
 * Returns results sorted cheapest first.
 *
 * @example
 * ```ts
 * const ranked = compare({ inputTokens: 10_000, outputTokens: 2_000 });
 * ```
 */
export function compare(
  usage: TokenUsage,
  models?: string[],
  options: { batch?: boolean } = {}
): CompareResult[] {
  return llmCost()
    .usage(usage)
    .batch(options.batch ?? false)
    .compare(models);
}

/**
 * Get the normalised pricing object for a specific model.
 */
export function getModelPricing(model: string): ModelPricing {
  return resolveModel(model);
}

/**
 * List all models, optionally filtered by provider string.
 *
 * @example
 * ```ts
 * listModels("anthropic")  // all Anthropic models
 * listModels("openai")     // all OpenAI models
 * listModels()             // everything in the database
 * ```
 */
export function listModels(provider?: string): ModelPricing[] {
  return provider
    ? MODELS.filter((m) => m.provider === provider)
    : [...MODELS];
}

/**
 * Format a USD cost as a human-readable dollar string.
 *
 * @example
 * ```ts
 * formatCost(0.00123)  // "$0.001230"
 * formatCost(1.5, 2)   // "$1.50"
 * ```
 */
export function formatCost(usd: number, decimals = 6): string {
  return `$${usd.toFixed(decimals)}`;
}
