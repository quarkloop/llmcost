/**
 * Pricing database for LLM models.
 * All prices are in USD per 1,000,000 tokens (per MTok).
 * Last updated: March 2026
 */

export type Provider = "openai" | "anthropic";

export interface ModelPricing {
  /** Model identifier */
  model: string;
  /** Provider name */
  provider: Provider;
  /** Human-readable display name */
  displayName: string;
  /** Cost per 1M input tokens in USD */
  inputPricePerMToken: number;
  /** Cost per 1M output tokens in USD */
  outputPricePerMToken: number;
  /** Cost per 1M cached input tokens in USD (if supported) */
  cachedInputPricePerMToken?: number;
  /** Context window size in tokens */
  contextWindow?: number;
  /** Whether this model is deprecated / legacy */
  deprecated?: boolean;
}

export const MODELS: ModelPricing[] = [
  // ── Anthropic ────────────────────────────────────────────────────────────
  {
    model: "claude-opus-4-6",
    provider: "anthropic",
    displayName: "Claude Opus 4.6",
    inputPricePerMToken: 5.0,
    outputPricePerMToken: 25.0,
    cachedInputPricePerMToken: 0.5,
    contextWindow: 200000,
  },
  {
    model: "claude-opus-4-5",
    provider: "anthropic",
    displayName: "Claude Opus 4.5",
    inputPricePerMToken: 5.0,
    outputPricePerMToken: 25.0,
    cachedInputPricePerMToken: 0.5,
    contextWindow: 200000,
  },
  {
    model: "claude-opus-4-1",
    provider: "anthropic",
    displayName: "Claude Opus 4.1 (Legacy)",
    inputPricePerMToken: 15.0,
    outputPricePerMToken: 75.0,
    cachedInputPricePerMToken: 1.5,
    contextWindow: 200000,
    deprecated: true,
  },
  {
    model: "claude-sonnet-4-6",
    provider: "anthropic",
    displayName: "Claude Sonnet 4.6",
    inputPricePerMToken: 3.0,
    outputPricePerMToken: 15.0,
    cachedInputPricePerMToken: 0.3,
    contextWindow: 200000,
  },
  {
    model: "claude-sonnet-4-5",
    provider: "anthropic",
    displayName: "Claude Sonnet 4.5",
    inputPricePerMToken: 3.0,
    outputPricePerMToken: 15.0,
    cachedInputPricePerMToken: 0.3,
    contextWindow: 200000,
  },
  {
    model: "claude-sonnet-4",
    provider: "anthropic",
    displayName: "Claude Sonnet 4",
    inputPricePerMToken: 3.0,
    outputPricePerMToken: 15.0,
    cachedInputPricePerMToken: 0.3,
    contextWindow: 200000,
  },
  {
    model: "claude-haiku-4-5",
    provider: "anthropic",
    displayName: "Claude Haiku 4.5",
    inputPricePerMToken: 1.0,
    outputPricePerMToken: 5.0,
    cachedInputPricePerMToken: 0.1,
    contextWindow: 200000,
  },
  {
    model: "claude-haiku-3-5",
    provider: "anthropic",
    displayName: "Claude Haiku 3.5",
    inputPricePerMToken: 0.8,
    outputPricePerMToken: 4.0,
    cachedInputPricePerMToken: 0.08,
    contextWindow: 200000,
  },
  {
    model: "claude-haiku-3",
    provider: "anthropic",
    displayName: "Claude Haiku 3 (Legacy)",
    inputPricePerMToken: 0.25,
    outputPricePerMToken: 1.25,
    cachedInputPricePerMToken: 0.03,
    contextWindow: 200000,
    deprecated: true,
  },

  // ── OpenAI ───────────────────────────────────────────────────────────────
  {
    model: "gpt-4o",
    provider: "openai",
    displayName: "GPT-4o",
    inputPricePerMToken: 2.5,
    outputPricePerMToken: 10.0,
    cachedInputPricePerMToken: 1.25,
    contextWindow: 128000,
  },
  {
    model: "gpt-4o-mini",
    provider: "openai",
    displayName: "GPT-4o Mini",
    inputPricePerMToken: 0.15,
    outputPricePerMToken: 0.6,
    cachedInputPricePerMToken: 0.075,
    contextWindow: 128000,
  },
  {
    model: "gpt-4.1",
    provider: "openai",
    displayName: "GPT-4.1",
    inputPricePerMToken: 2.0,
    outputPricePerMToken: 8.0,
    cachedInputPricePerMToken: 1.0,
    contextWindow: 1000000,
  },
  {
    model: "gpt-4.1-mini",
    provider: "openai",
    displayName: "GPT-4.1 Mini",
    inputPricePerMToken: 0.4,
    outputPricePerMToken: 1.6,
    cachedInputPricePerMToken: 0.2,
    contextWindow: 1000000,
  },
  {
    model: "gpt-4",
    provider: "openai",
    displayName: "GPT-4 (Legacy)",
    inputPricePerMToken: 30.0,
    outputPricePerMToken: 60.0,
    contextWindow: 8192,
    deprecated: true,
  },
  {
    model: "gpt-3.5-turbo",
    provider: "openai",
    displayName: "GPT-3.5 Turbo (Legacy)",
    inputPricePerMToken: 0.5,
    outputPricePerMToken: 1.5,
    contextWindow: 16385,
    deprecated: true,
  },
  {
    model: "o1",
    provider: "openai",
    displayName: "OpenAI o1",
    inputPricePerMToken: 15.0,
    outputPricePerMToken: 60.0,
    cachedInputPricePerMToken: 7.5,
    contextWindow: 200000,
  },
  {
    model: "o1-mini",
    provider: "openai",
    displayName: "OpenAI o1 Mini",
    inputPricePerMToken: 1.1,
    outputPricePerMToken: 4.4,
    cachedInputPricePerMToken: 0.55,
    contextWindow: 128000,
  },
  {
    model: "o3",
    provider: "openai",
    displayName: "OpenAI o3",
    inputPricePerMToken: 10.0,
    outputPricePerMToken: 40.0,
    cachedInputPricePerMToken: 2.5,
    contextWindow: 200000,
  },
  {
    model: "o3-mini",
    provider: "openai",
    displayName: "OpenAI o3 Mini",
    inputPricePerMToken: 1.1,
    outputPricePerMToken: 4.4,
    cachedInputPricePerMToken: 0.55,
    contextWindow: 200000,
  },
  {
    model: "o4-mini",
    provider: "openai",
    displayName: "OpenAI o4 Mini",
    inputPricePerMToken: 1.1,
    outputPricePerMToken: 4.4,
    cachedInputPricePerMToken: 0.275,
    contextWindow: 200000,
  },
];

/** Lookup map: model string → ModelPricing */
export const MODEL_MAP = new Map<string, ModelPricing>(
  MODELS.map((m) => [m.model, m])
);
