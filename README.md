# llmcost

> Calculate token costs across 1700+ LLM models. Powered by the [tokencost](https://github.com/AgentOps-AI/tokencost) pricing database. Zero dependencies. Works in Node.js and the browser.

[![npm version](https://img.shields.io/npm/v/@quarkloop/llmcost?style=flat-square)](https://www.npmjs.com/package/@quarkloop/llmcost)
[![CI](https://img.shields.io/github/actions/workflow/status/quarkloop/llmcost/ci.yml?style=flat-square&label=CI)](https://github.com/quarkloop/llmcost/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)
[![Bundle size](https://img.shields.io/bundlephobia/minzip/@quarkloop/llmcost?style=flat-square)](https://bundlephobia.com/package/@quarkloop/llmcost)

---

## Features

- 🔗 **Fluent builder API** — chainable `.model().input().output().batch().calculate()`
- 📦 **1700+ models** from the tokencost / LiteLLM pricing database
- 💰 **Full cost breakdown** — input, output, cache read/write, reasoning tokens
- ⚡ **Batch API pricing** — OpenAI and Anthropic batch discounts
- 🧩 **Extensible** — register custom models or override existing prices
- 🌐 **Zero dependencies** — works in Node.js, browser, and edge runtimes
- 🔷 **Fully typed TypeScript** with ESM + CJS dual build

---

## Installation

```bash
npm install @quarkloop/llmcost
# or
pnpm add @quarkloop/llmcost
# or
yarn add @quarkloop/llmcost
# or
bun add @quarkloop/llmcost
```

---

## Usage

### Builder API (recommended)

```ts
import { llmCost } from "@quarkloop/llmcost";

// Basic calculation
const result = llmCost()
  .model("gpt-4o")
  .input(10_000)
  .output(2_000)
  .calculate();

console.log(result.totalCost);    // 0.045 (USD)
console.log(result.breakdown);
// { inputCost: 0.025, outputCost: 0.02, cacheReadCost: 0, cacheWriteCost: 0, reasoningCost: 0 }
```

### With prompt caching

```ts
const result = llmCost()
  .model("claude-3-5-sonnet-20241022")
  .input(10_000)
  .output(2_000)
  .cachedRead(8_000)    // tokens read from cache (cheaper)
  .cachedWrite(2_000)   // tokens written to cache
  .calculate();
```

### With reasoning tokens (o1, o3, extended thinking)

```ts
const result = llmCost()
  .model("o1")
  .input(5_000)
  .output(1_000)
  .reasoning(3_000)   // thinking tokens billed separately
  .calculate();
```

### With Batch API discount

```ts
const result = llmCost()
  .model("gpt-4o")
  .input(10_000)
  .output(2_000)
  .batch()         // applies 50% batch discount where available
  .calculate();
```

### Set all usage at once

```ts
const result = llmCost()
  .model("gpt-4o-mini")
  .usage({
    inputTokens: 10_000,
    outputTokens: 2_000,
    cachedReadTokens: 5_000,
    reasoningTokens: 0,
  })
  .calculate();
```

### Compare across models — cheapest first

```ts
const ranked = llmCost()
  .input(10_000)
  .output(2_000)
  .compare();                           // all 1700+ models

const subset = llmCost()
  .input(10_000)
  .output(2_000)
  .compare(["gpt-4o", "gpt-4o-mini", "claude-3-5-sonnet-20241022"]);

subset.forEach(r => console.log(`${r.model}: $${r.totalCost}`));
```

### Standalone helpers (no builder)

```ts
import { calculate, compare, formatCost } from "@quarkloop/llmcost";

const result = calculate("gpt-4o", { inputTokens: 1000, outputTokens: 500 });
console.log(formatCost(result.totalCost)); // "$0.007500"

const ranked = compare({ inputTokens: 1000, outputTokens: 500 }, ["gpt-4o", "gpt-4o-mini"]);
```

### Register custom or overridden models

```ts
import { registerModels } from "@quarkloop/llmcost";

registerModels({
  "my-fine-tuned-model": {
    litellm_provider: "openai",
    mode: "chat",
    input_cost_per_token: 5e-6,
    output_cost_per_token: 15e-6,
  },
});

// Now usable anywhere
const result = llmCost().model("my-fine-tuned-model").input(1000).output(500).calculate();
```

### List and inspect models

```ts
import { listModels, getModelPricing } from "@quarkloop/llmcost";

const all = listModels();                    // 1700+ models
const anthropic = listModels("anthropic");
const openai = listModels("openai");

const pricing = getModelPricing("gpt-4o");
console.log(pricing.inputCostPerToken);      // 2.5e-6
console.log(pricing.supportsVision);         // true
console.log(pricing.supportsPromptCaching);  // true
```

---

## API Reference

### `llmCost()` → `LlmCostBuilder`

Creates a new builder instance.

| Method | Description |
|---|---|
| `.model(name)` | Set the model identifier |
| `.input(n)` | Input / prompt token count |
| `.output(n)` | Output / completion token count |
| `.cachedRead(n)` | Tokens read from prompt cache |
| `.cachedWrite(n)` | Tokens written to prompt cache |
| `.reasoning(n)` | Reasoning / thinking token count |
| `.batch(enabled?)` | Apply batch API discount (default `true`) |
| `.usage(obj)` | Set all token counts at once |
| `.calculate()` | Execute and return `CostResult` |
| `.compare(models?)` | Compare across models, returns `CompareResult[]` sorted cheapest first |

### `CostResult`

```ts
{
  model: string;
  provider: string;
  mode: string;
  totalCost: number;       // USD
  isBatch: boolean;
  breakdown: {
    inputCost: number;
    outputCost: number;
    cacheReadCost: number;
    cacheWriteCost: number;
    reasoningCost: number;
  };
  usage: {
    inputTokens: number;
    outputTokens: number;
    cachedReadTokens: number;
    cachedWriteTokens: number;
    reasoningTokens: number;
  };
}
```

### Standalone functions

| Function | Description |
|---|---|
| `calculate(model, usage, options?)` | Single-call cost calculation |
| `compare(usage, models?, options?)` | Compare models, sorted cheapest first |
| `getModelPricing(model)` | Raw `ModelPricing` object |
| `listModels(provider?)` | All models, optionally filtered by provider |
| `registerModels(entries)` | Add or override models in the registry |
| `formatCost(usd, decimals?)` | Format USD as `"$0.001234"` |

---

## Pricing Data

Model prices are sourced from the [tokencost](https://github.com/AgentOps-AI/tokencost) / LiteLLM `model_prices.json` — a community-maintained database covering 1700+ models across OpenAI, Anthropic, Google, Mistral, Cohere, and more.

Prices are **bundled at build time**. To get the latest prices, update the package to the newest version.

You can inspect the bundled snapshot version at runtime:

\`\`\`ts
import { PRICING_DATA_VERSION } from "@quarkloop/llmcost";

console.log(PRICING_DATA_VERSION.lastUpdated);  // "2026-03-07"
console.log(PRICING_DATA_VERSION.modelCount);   // 1701
console.log(PRICING_DATA_VERSION.sourceUrl);    // upstream URL
\`\`\`

### Pricing Data Version History

| Package version | Pricing data date | Model count | Source |
|-----------------|-------------------|-------------|--------|
| `0.1.0` | 2026-03-07 | 1701 | [AgentOps-AI/tokencost](https://github.com/AgentOps-AI/tokencost/blob/main/tokencost/model_prices.json) |

---

## License

MIT © [Reza Ebrahimi](https://github.com/reza-ebrahimi)
