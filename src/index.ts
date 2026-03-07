export { llmCost, LlmCostBuilder, calculate, compare, getModelPricing, listModels, formatCost } from "./calculate";
export type { TokenUsage, CostBreakdown, CostResult, CompareResult } from "./calculate";
export { MODELS, MODEL_MAP, registerModels } from "./models";
export type { ModelPricing, RawModelEntry, RawPriceDatabase } from "./models";

/**
 * Metadata about the bundled pricing data snapshot.
 * Use this to know which version of tokencost/model_prices.json
 * is bundled in this release, and when it was last updated.
 */
export const PRICING_DATA_VERSION = {
  /** ISO date when the model_prices.json snapshot was last updated in this package */
  lastUpdated: "2026-03-07",
  /** Total number of models in the bundled pricing database */
  modelCount: 1701,
  /** Upstream source of the pricing data */
  source: "AgentOps-AI/tokencost",
  /** URL to the upstream model_prices.json */
  sourceUrl: "https://github.com/AgentOps-AI/tokencost/blob/main/tokencost/model_prices.json",
} as const;
