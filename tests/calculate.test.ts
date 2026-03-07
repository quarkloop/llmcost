import { describe, it, expect, beforeEach } from "vitest";
import {
  llmCost,
  LlmCostBuilder,
  calculate,
  compare,
  getModelPricing,
  listModels,
  formatCost,
} from "../src/index";
import { MODEL_MAP, registerModels } from "../src/models";

// ── LlmCostBuilder — fluent API ───────────────────────────────────────────────

describe("LlmCostBuilder — fluent API", () => {
  it("llmCost() returns a new LlmCostBuilder", () => {
    expect(llmCost()).toBeInstanceOf(LlmCostBuilder);
  });

  it("each builder call returns the same instance (chaining)", () => {
    const b = llmCost();
    expect(b.model("gpt-4o")).toBe(b);
    expect(b.input(100)).toBe(b);
    expect(b.output(50)).toBe(b);
    expect(b.cachedRead(20)).toBe(b);
    expect(b.cachedWrite(10)).toBe(b);
    expect(b.reasoning(5)).toBe(b);
    expect(b.batch()).toBe(b);
  });

  it("throws if .calculate() is called without .model()", () => {
    expect(() => llmCost().input(100).output(50).calculate()).toThrowError(
      /Model is required/
    );
  });

  it("throws for unknown model string", () => {
    expect(() =>
      llmCost().model("unicorn-9000").input(100).output(50).calculate()
    ).toThrowError(/Unknown model/);
  });

  it("full chain: model + input + output", () => {
    const result = llmCost().model("gpt-4o").input(1000).output(500).calculate();
    expect(result.model).toBe("gpt-4o");
    expect(result.provider).toBe("openai");
    expect(result.totalCost).toBeGreaterThan(0);
    expect(result.isBatch).toBe(false);
  });

  it(".batch() enables batch pricing", () => {
    const normal = llmCost().model("gpt-4o").input(1000).output(500).calculate();
    const batched = llmCost().model("gpt-4o").input(1000).output(500).batch().calculate();
    expect(batched.isBatch).toBe(true);
    expect(batched.totalCost).toBeLessThan(normal.totalCost);
  });

  it(".batch(false) disables batch pricing", () => {
    const result = llmCost().model("gpt-4o").input(1000).output(500).batch(false).calculate();
    expect(result.isBatch).toBe(false);
  });

  it(".usage() sets all token fields at once", () => {
    const result = llmCost()
      .model("gpt-4o")
      .usage({ inputTokens: 2000, outputTokens: 1000, cachedReadTokens: 500 })
      .calculate();
    expect(result.usage.inputTokens).toBe(2000);
    expect(result.usage.outputTokens).toBe(1000);
    expect(result.usage.cachedReadTokens).toBe(500);
  });

  it(".usage() can be overridden by subsequent calls", () => {
    const result = llmCost()
      .model("gpt-4o")
      .usage({ inputTokens: 2000, outputTokens: 1000 })
      .input(5000)
      .calculate();
    expect(result.usage.inputTokens).toBe(5000);
    expect(result.usage.outputTokens).toBe(1000);
  });

  it("CostResult has all required fields", () => {
    const result = llmCost().model("gpt-4o").input(1000).output(500).calculate();
    expect(result).toHaveProperty("model");
    expect(result).toHaveProperty("provider");
    expect(result).toHaveProperty("mode");
    expect(result).toHaveProperty("totalCost");
    expect(result).toHaveProperty("breakdown");
    expect(result).toHaveProperty("usage");
    expect(result).toHaveProperty("isBatch");
    expect(result.breakdown).toHaveProperty("inputCost");
    expect(result.breakdown).toHaveProperty("outputCost");
    expect(result.breakdown).toHaveProperty("cacheReadCost");
    expect(result.breakdown).toHaveProperty("cacheWriteCost");
    expect(result.breakdown).toHaveProperty("reasoningCost");
  });
});

// ── LlmCostBuilder — cost accuracy ───────────────────────────────────────────

describe("LlmCostBuilder — cost accuracy", () => {
  it("calculates gpt-4o input cost correctly (per-token)", () => {
    // gpt-4o: input = 2.5e-6 per token
    const result = llmCost().model("gpt-4o").input(1_000_000).output(0).calculate();
    expect(result.breakdown.inputCost).toBeCloseTo(2.5, 4);
  });

  it("calculates gpt-4o output cost correctly (per-token)", () => {
    // gpt-4o: output = 1e-5 per token
    const result = llmCost().model("gpt-4o").input(0).output(1_000_000).calculate();
    expect(result.breakdown.outputCost).toBeCloseTo(10.0, 4);
  });

  it("deducts cachedRead tokens from pureInput", () => {
    const withCache = llmCost()
      .model("gpt-4o")
      .input(1000)
      .output(0)
      .cachedRead(1000)
      .calculate();
    // all input is cached — pureInput = 0
    expect(withCache.breakdown.inputCost).toBe(0);
    expect(withCache.breakdown.cacheReadCost).toBeGreaterThan(0);
  });

  it("cacheWriteCost is computed when cachedWrite is set", () => {
    const result = llmCost()
      .model("claude-3-5-sonnet-20241022")
      .input(1000)
      .output(500)
      .cachedWrite(500)
      .calculate();
    expect(result.breakdown.cacheWriteCost).toBeGreaterThanOrEqual(0);
  });

  it("reasoningCost is computed for reasoning tokens", () => {
    const result = llmCost()
      .model("o1")
      .input(1000)
      .output(500)
      .reasoning(200)
      .calculate();
    expect(result.breakdown.reasoningCost).toBeGreaterThanOrEqual(0);
  });

  it("totalCost equals sum of all breakdown parts", () => {
    const result = llmCost()
      .model("gpt-4o")
      .input(3000)
      .output(1500)
      .cachedRead(500)
      .cachedWrite(200)
      .reasoning(100)
      .calculate();
    const { inputCost, outputCost, cacheReadCost, cacheWriteCost, reasoningCost } =
      result.breakdown;
    expect(result.totalCost).toBeCloseTo(
      inputCost + outputCost + cacheReadCost + cacheWriteCost + reasoningCost,
      8
    );
  });

  it("returns zero cost for all-zero usage", () => {
    const result = llmCost().model("gpt-4o-mini").input(0).output(0).calculate();
    expect(result.totalCost).toBe(0);
  });

  it("handles very large token counts without overflow", () => {
    const result = llmCost()
      .model("gpt-4o")
      .input(100_000_000)
      .output(50_000_000)
      .calculate();
    // 100M * 2.5e-6 = $250, 50M * 1e-5 = $500 → $750
    expect(result.totalCost).toBeCloseTo(750, 2);
  });

  it("batch pricing is lower than standard pricing", () => {
    const standard = llmCost().model("gpt-4o").input(10_000).output(5_000).calculate();
    const batch = llmCost().model("gpt-4o").input(10_000).output(5_000).batch().calculate();
    expect(batch.totalCost).toBeLessThan(standard.totalCost);
  });

  it("batch falls back to standard rate when no batch price exists", () => {
    // Find a model without batch pricing and confirm it still calculates
    const result = llmCost().model("gpt-4").input(1000).output(500).batch().calculate();
    expect(result.totalCost).toBeGreaterThanOrEqual(0);
  });
});

// ── LlmCostBuilder — compare() ────────────────────────────────────────────────

describe("LlmCostBuilder — .compare()", () => {
  it("returns results sorted cheapest first", () => {
    const results = llmCost().input(1000).output(500).compare(["gpt-4o", "gpt-4o-mini"]);
    expect(results[0].totalCost).toBeLessThanOrEqual(results[1].totalCost);
  });

  it("compares across all models when no filter given", () => {
    const results = llmCost().input(100).output(100).compare();
    expect(results.length).toBeGreaterThan(100);
  });

  it("filters to specified models only", () => {
    const models = ["gpt-4o", "claude-3-5-sonnet-20241022"];
    const results = llmCost().input(1000).output(500).compare(models);
    expect(results.length).toBe(2);
    const returnedModels = results.map((r) => r.model);
    expect(returnedModels).toContain("gpt-4o");
    expect(returnedModels).toContain("claude-3-5-sonnet-20241022");
  });

  it("throws on unknown model in compare filter", () => {
    expect(() =>
      llmCost().input(100).output(100).compare(["not-a-real-model"])
    ).toThrowError(/Unknown model/);
  });

  it("batch flag is respected in compare()", () => {
    const standard = llmCost().input(10_000).output(5_000).compare(["gpt-4o"]);
    const batch = llmCost().input(10_000).output(5_000).batch().compare(["gpt-4o"]);
    expect(batch[0].totalCost).toBeLessThan(standard[0].totalCost);
  });

  it("CompareResult has required fields", () => {
    const results = llmCost().input(100).output(100).compare(["gpt-4o"]);
    expect(results[0]).toHaveProperty("model");
    expect(results[0]).toHaveProperty("provider");
    expect(results[0]).toHaveProperty("mode");
    expect(results[0]).toHaveProperty("totalCost");
    expect(results[0]).toHaveProperty("breakdown");
  });
});

// ── calculate() standalone ────────────────────────────────────────────────────

describe("calculate() standalone", () => {
  it("returns correct result for gpt-4o", () => {
    const result = calculate("gpt-4o", { inputTokens: 1000, outputTokens: 500 });
    expect(result.model).toBe("gpt-4o");
    expect(result.totalCost).toBeGreaterThan(0);
  });

  it("passes batch option correctly", () => {
    const normal = calculate("gpt-4o", { inputTokens: 1000, outputTokens: 500 });
    const batch = calculate("gpt-4o", { inputTokens: 1000, outputTokens: 500 }, { batch: true });
    expect(batch.totalCost).toBeLessThan(normal.totalCost);
  });

  it("throws for unknown model", () => {
    expect(() =>
      calculate("not-a-model", { inputTokens: 100, outputTokens: 50 })
    ).toThrowError(/Unknown model/);
  });

  it("defaults optional token fields to 0", () => {
    const result = calculate("gpt-4o", { inputTokens: 1000, outputTokens: 500 });
    expect(result.usage.cachedReadTokens).toBe(0);
    expect(result.usage.cachedWriteTokens).toBe(0);
    expect(result.usage.reasoningTokens).toBe(0);
  });
});

// ── compare() standalone ─────────────────────────────────────────────────────

describe("compare() standalone", () => {
  it("returns sorted array", () => {
    const results = compare({ inputTokens: 1000, outputTokens: 500 });
    for (let i = 1; i < results.length; i++) {
      expect(results[i].totalCost).toBeGreaterThanOrEqual(results[i - 1].totalCost);
    }
  });

  it("respects model filter", () => {
    const results = compare(
      { inputTokens: 1000, outputTokens: 500 },
      ["gpt-4o-mini", "gpt-4o"]
    );
    expect(results.length).toBe(2);
  });

  it("respects batch option", () => {
    const normal = compare({ inputTokens: 1000, outputTokens: 500 }, ["gpt-4o"]);
    const batch = compare({ inputTokens: 1000, outputTokens: 500 }, ["gpt-4o"], { batch: true });
    expect(batch[0].totalCost).toBeLessThan(normal[0].totalCost);
  });
});

// ── getModelPricing() ─────────────────────────────────────────────────────────

describe("getModelPricing()", () => {
  it("returns pricing for a known OpenAI model", () => {
    const pricing = getModelPricing("gpt-4o");
    expect(pricing.provider).toBe("openai");
    expect(pricing.inputCostPerToken).toBeGreaterThan(0);
    expect(pricing.outputCostPerToken).toBeGreaterThan(0);
  });

  it("returns pricing for a known Anthropic model", () => {
    const pricing = getModelPricing("claude-3-5-sonnet-20241022");
    expect(pricing.provider).toBe("anthropic");
    expect(pricing.inputCostPerToken).toBeGreaterThan(0);
  });

  it("exposes boolean capability flags", () => {
    const pricing = getModelPricing("gpt-4o");
    expect(typeof pricing.supportsVision).toBe("boolean");
    expect(typeof pricing.supportsFunctionCalling).toBe("boolean");
    expect(typeof pricing.supportsPromptCaching).toBe("boolean");
    expect(typeof pricing.supportsReasoning).toBe("boolean");
  });

  it("throws for unknown model", () => {
    expect(() => getModelPricing("fake-xyz")).toThrowError(/Unknown model/);
  });
});

// ── listModels() ──────────────────────────────────────────────────────────────

describe("listModels()", () => {
  it("returns all models without filter", () => {
    const all = listModels();
    expect(all.length).toBeGreaterThan(100);
  });

  it("filters to anthropic provider", () => {
    const models = listModels("anthropic");
    expect(models.length).toBeGreaterThan(0);
    expect(models.every((m) => m.provider === "anthropic")).toBe(true);
  });

  it("filters to openai provider", () => {
    const models = listModels("openai");
    expect(models.length).toBeGreaterThan(0);
    expect(models.every((m) => m.provider === "openai")).toBe(true);
  });

  it("returns a defensive copy (mutations do not affect registry)", () => {
    const first = listModels();
    const len = first.length;
    first.pop();
    expect(listModels().length).toBe(len);
  });
});

// ── registerModels() ──────────────────────────────────────────────────────────

describe("registerModels()", () => {
  it("adds a custom model to the registry", () => {
    registerModels({
      "my-custom-model": {
        litellm_provider: "custom",
        mode: "chat",
        input_cost_per_token: 1e-6,
        output_cost_per_token: 2e-6,
      },
    });
    const pricing = getModelPricing("my-custom-model");
    expect(pricing.provider).toBe("custom");
    expect(pricing.inputCostPerToken).toBe(1e-6);
  });

  it("allows overriding an existing model's pricing", () => {
    const before = getModelPricing("gpt-4o-mini").inputCostPerToken;
    registerModels({
      "gpt-4o-mini": {
        litellm_provider: "openai",
        mode: "chat",
        input_cost_per_token: 9.99e-6,
        output_cost_per_token: 9.99e-6,
      },
    });
    const after = getModelPricing("gpt-4o-mini").inputCostPerToken;
    expect(after).toBe(9.99e-6);
    expect(after).not.toBe(before);

    // Restore original for other tests
    registerModels({
      "gpt-4o-mini": {
        litellm_provider: "openai",
        mode: "chat",
        input_cost_per_token: 1.5e-7,
        output_cost_per_token: 6e-7,
      },
    });
  });

  it("custom model can be used in llmCost() builder", () => {
    registerModels({
      "test-model-builder": {
        litellm_provider: "test",
        mode: "chat",
        input_cost_per_token: 5e-6,
        output_cost_per_token: 10e-6,
      },
    });
    const result = llmCost()
      .model("test-model-builder")
      .input(1_000_000)
      .output(1_000_000)
      .calculate();
    expect(result.totalCost).toBeCloseTo(15.0, 4);
  });
});

// ── formatCost() ──────────────────────────────────────────────────────────────

describe("formatCost()", () => {
  it("formats zero correctly", () => {
    expect(formatCost(0)).toBe("$0.000000");
  });

  it("formats small cost with default 6 decimals", () => {
    expect(formatCost(0.001234567)).toBe("$0.001235");
  });

  it("formats large cost correctly", () => {
    expect(formatCost(750)).toBe("$750.000000");
  });

  it("respects custom decimal places", () => {
    expect(formatCost(1.23456789, 2)).toBe("$1.23");
    expect(formatCost(1.23456789, 8)).toBe("$1.23456789");
  });

  it("always starts with $", () => {
    expect(formatCost(99.99)).toMatch(/^\$/);
  });
});
