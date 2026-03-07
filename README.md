# llm-cost

> Calculate token costs across OpenAI and Anthropic models. Zero dependencies. Works in Node.js and the browser.

[![npm version](https://img.shields.io/npm/v/llm-cost?style=flat-square)](https://www.npmjs.com/package/llm-cost)
[![CI](https://img.shields.io/github/actions/workflow/status/reza-ebrahimi/llm-cost/ci.yml?style=flat-square&label=CI)](https://github.com/reza-ebrahimi/llm-cost/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)
[![Bundle size](https://img.shields.io/bundlephobia/minzip/llm-cost?style=flat-square)](https://bundlephobia.com/package/llm-cost)

---

## Features

- 💰 Calculate cost for any supported model given input/output token counts
- 🔄 Compare cost across all models (or a subset) — sorted cheapest first
- ⚡ Supports prompt caching discounts (Anthropic & OpenAI)
- 📦 Supports 50% Batch API discount for both providers
- 🌐 Zero dependencies — works in Node.js, browsers, and edge runtimes
- 🔷 Fully typed TypeScript with ESM + CJS dual build

## Supported Models

**Anthropic:** Claude Opus 4.6, Claude Opus 4.5, Claude Sonnet 4.6, Claude Sonnet 4.5, Claude Sonnet 4, Claude Haiku 4.5, Claude Haiku 3.5, Claude Haiku 3

**OpenAI:** GPT-4o, GPT-4o Mini, GPT-4.1, GPT-4.1 Mini, o1, o1 Mini, o3, o3 Mini, o4 Mini, GPT-4 (legacy), GPT-3.5 Turbo (legacy)

---

## Installation

```bash
npm install llm-cost
# or
pnpm add llm-cost
# or
yarn add llm-cost
```

---

## Usage

### Calculate cost for a single model

```ts
import { calculate, formatCost } from "llm-cost";

const result = calculate("claude-sonnet-4-6", {
  inputTokens: 10_000,
  outputTokens: 2_000,
});

console.log(result.totalCost);         // 0.06 (USD)
console.log(formatCost(result.totalCost)); // "$0.060000"
console.log(result.breakdown);
// { inputCost: 0.03, outputCost: 0.03, cachedCost: 0 }
```

### With prompt caching

```ts
const result = calculate("claude-sonnet-4-6", {
  inputTokens: 10_000,
  outputTokens: 2_000,
  cachedTokens: 8_000,   // 8k tokens served from cache
});

console.log(result.totalCost);  // significantly cheaper
```

### With Batch API discount (50% off)

```ts
const result = calculate(
  "gpt-4o",
  { inputTokens: 10_000, outputTokens: 2_000 },
  { batch: true }
);
```

### Compare all models — cheapest first

```ts
import { compare } from "llm-cost";

const ranked = compare({ inputTokens: 10_000, outputTokens: 2_000 });

ranked.forEach((r) => {
  console.log(`${r.displayName}: $${r.totalCost}`);
});
// claude-haiku-3: $0.000675
// gpt-4o-mini: $0.0027
// claude-haiku-3-5: ...
// ...
```

### Compare a specific subset of models

```ts
const results = compare(
  { inputTokens: 5_000, outputTokens: 1_000 },
  ["gpt-4o", "claude-sonnet-4-6", "claude-haiku-4-5"]
);
```

### Get raw pricing for a model

```ts
import { getModelPricing } from "llm-cost";

const pricing = getModelPricing("gpt-4o");
console.log(pricing.inputPricePerMToken);  // 2.5  (per 1M tokens)
console.log(pricing.outputPricePerMToken); // 10.0
```

### List all models

```ts
import { listModels } from "llm-cost";

const all = listModels();
const anthropicOnly = listModels("anthropic");
const openaiOnly = listModels("openai");
```

---

## API

### `calculate(model, usage, options?)`

| Parameter | Type | Description |
|---|---|---|
| `model` | `string` | Model identifier (e.g. `"gpt-4o"`, `"claude-sonnet-4-6"`) |
| `usage.inputTokens` | `number` | Number of input / prompt tokens |
| `usage.outputTokens` | `number` | Number of output / completion tokens |
| `usage.cachedTokens` | `number?` | Tokens served from cache (default `0`) |
| `options.batch` | `boolean?` | Apply 50% batch API discount (default `false`) |

Returns `CostResult`:

```ts
{
  model: string;
  provider: "openai" | "anthropic";
  displayName: string;
  totalCost: number;          // USD
  breakdown: {
    inputCost: number;
    outputCost: number;
    cachedCost: number;
  };
  usage: { inputTokens, outputTokens, cachedTokens };
}
```

### `compare(usage, models?, options?)`

Same `usage` and `options` as `calculate`. Optionally pass an array of model strings to limit the comparison. Returns `CompareResult[]` sorted by `totalCost` ascending.

### `getModelPricing(model)`

Returns the raw `ModelPricing` object for a model, including prices per MTok and context window size.

### `listModels(provider?)`

Returns all `ModelPricing` entries, optionally filtered to `"openai"` or `"anthropic"`.

### `formatCost(usd, decimals?)`

Formats a USD number as a dollar string. Default 6 decimal places.

---

## Pricing last updated

March 2026. Prices are hardcoded and reflect official provider documentation at the time of the release. If prices change, open an issue or PR.

---

## License

MIT © [Reza Ebrahimi](https://github.com/reza-ebrahimi)
