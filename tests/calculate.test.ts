import { describe, it, expect } from "vitest";
import {
  calculate,
  compare,
  getModelPricing,
  listModels,
  formatCost,
} from "../src/index";

// ── calculate() ──────────────────────────────────────────────────────────────

describe("calculate()", () => {
  it("returns correct structure", () => {
    const result = calculate("claude-sonnet-4-6", {
      inputTokens: 1000,
      outputTokens: 500,
    });
    expect(result).toMatchObject({
      model: "claude-sonnet-4-6",
      provider: "anthropic",
      displayName: "Claude Sonnet 4.6",
    });
    expect(result.totalCost).toBeTypeOf("number");
    expect(result.breakdown).toHaveProperty("inputCost");
    expect(result.breakdown).toHaveProperty("outputCost");
    expect(result.breakdown).toHaveProperty("cachedCost");
  });

  it("calculates claude-sonnet-4-6 cost correctly", () => {
    // 1M input = $3.00, 1M output = $15.00
    // 1000 input = $0.003, 500 output = $0.0075 → total = $0.0105
    const result = calculate("claude-sonnet-4-6", {
      inputTokens: 1000,
      outputTokens: 500,
    });
    expect(result.breakdown.inputCost).toBeCloseTo(0.003, 6);
    expect(result.breakdown.outputCost).toBeCloseTo(0.0075, 6);
    expect(result.totalCost).toBeCloseTo(0.0105, 6);
  });

  it("calculates gpt-4o cost correctly", () => {
    // 1M input = $2.50, 1M output = $10.00
    // 2000 input = $0.005, 1000 output = $0.01 → total = $0.015
    const result = calculate("gpt-4o", {
      inputTokens: 2000,
      outputTokens: 1000,
    });
    expect(result.breakdown.inputCost).toBeCloseTo(0.005, 6);
    expect(result.breakdown.outputCost).toBeCloseTo(0.01, 6);
    expect(result.totalCost).toBeCloseTo(0.015, 6);
  });

  it("correctly handles cached tokens", () => {
    // claude-sonnet-4-6: cached = $0.30/MTok, input = $3.00/MTok
    // 500 cached → (500/1M)*0.30 = $0.00015
    // 500 non-cached input → (500/1M)*3.00 = $0.0015
    // 200 output → (200/1M)*15.00 = $0.003
    const result = calculate("claude-sonnet-4-6", {
      inputTokens: 1000,
      outputTokens: 200,
      cachedTokens: 500,
    });
    expect(result.breakdown.cachedCost).toBeCloseTo(0.00015, 7);
    expect(result.breakdown.inputCost).toBeCloseTo(0.0015, 6);
    expect(result.breakdown.outputCost).toBeCloseTo(0.003, 6);
    expect(result.totalCost).toBeCloseTo(0.00465, 6);
  });

  it("applies 50% batch discount", () => {
    const normal = calculate("gpt-4o", { inputTokens: 1000, outputTokens: 500 });
    const batch = calculate("gpt-4o", { inputTokens: 1000, outputTokens: 500 }, { batch: true });
    expect(batch.totalCost).toBeCloseTo(normal.totalCost * 0.5, 8);
  });

  it("returns zero cost for zero tokens", () => {
    const result = calculate("gpt-4o-mini", {
      inputTokens: 0,
      outputTokens: 0,
    });
    expect(result.totalCost).toBe(0);
  });

  it("throws for unknown model", () => {
    expect(() =>
      calculate("gpt-99-ultra", { inputTokens: 100, outputTokens: 50 })
    ).toThrowError(/Unknown model/);
  });

  it("defaults cachedTokens to 0 when not provided", () => {
    const result = calculate("claude-haiku-4-5", {
      inputTokens: 1000,
      outputTokens: 1000,
    });
    expect(result.usage.cachedTokens).toBe(0);
    expect(result.breakdown.cachedCost).toBe(0);
  });

  it("handles large token counts without precision loss", () => {
    const result = calculate("claude-opus-4-6", {
      inputTokens: 10_000_000,
      outputTokens: 5_000_000,
    });
    // 10M input * $5/MTok = $50, 5M output * $25/MTok = $125 → $175
    expect(result.totalCost).toBeCloseTo(175, 4);
  });

  it("calculates o1 model correctly", () => {
    // input $15/MTok, output $60/MTok
    const result = calculate("o1", { inputTokens: 1000, outputTokens: 500 });
    expect(result.breakdown.inputCost).toBeCloseTo(0.015, 6);
    expect(result.breakdown.outputCost).toBeCloseTo(0.03, 6);
    expect(result.totalCost).toBeCloseTo(0.045, 6);
  });

  it("totalCost equals sum of breakdown parts", () => {
    const result = calculate("gpt-4o", {
      inputTokens: 3000,
      outputTokens: 1500,
      cachedTokens: 500,
    });
    const { inputCost, outputCost, cachedCost } = result.breakdown;
    expect(result.totalCost).toBeCloseTo(inputCost + outputCost + cachedCost, 8);
  });
});

// ── compare() ────────────────────────────────────────────────────────────────

describe("compare()", () => {
  it("returns array sorted by totalCost ascending", () => {
    const results = compare({ inputTokens: 1000, outputTokens: 500 });
    for (let i = 1; i < results.length; i++) {
      expect(results[i].totalCost).toBeGreaterThanOrEqual(results[i - 1].totalCost);
    }
  });

  it("returns all models when no filter is provided", () => {
    const all = listModels();
    const results = compare({ inputTokens: 100, outputTokens: 100 });
    expect(results.length).toBe(all.length);
  });

  it("filters to specified models", () => {
    const results = compare(
      { inputTokens: 1000, outputTokens: 500 },
      ["gpt-4o", "claude-sonnet-4-6"]
    );
    expect(results.length).toBe(2);
    const models = results.map((r) => r.model);
    expect(models).toContain("gpt-4o");
    expect(models).toContain("claude-sonnet-4-6");
  });

  it("applies batch discount in compare", () => {
    const normal = compare({ inputTokens: 1000, outputTokens: 500 }, ["gpt-4o"]);
    const batch = compare({ inputTokens: 1000, outputTokens: 500 }, ["gpt-4o"], { batch: true });
    expect(batch[0].totalCost).toBeCloseTo(normal[0].totalCost * 0.5, 8);
  });

  it("throws for unknown model in filter list", () => {
    expect(() =>
      compare({ inputTokens: 100, outputTokens: 100 }, ["not-a-model"])
    ).toThrowError(/Unknown model/);
  });

  it("cheapest model has the lowest per-token rate", () => {
    const results = compare({ inputTokens: 1000, outputTokens: 500 });
    // haiku-3 or gpt-4o-mini should be near the bottom
    expect(results[0].totalCost).toBeLessThan(results[results.length - 1].totalCost);
  });
});

// ── getModelPricing() ────────────────────────────────────────────────────────

describe("getModelPricing()", () => {
  it("returns correct pricing for known model", () => {
    const pricing = getModelPricing("claude-haiku-4-5");
    expect(pricing.inputPricePerMToken).toBe(1.0);
    expect(pricing.outputPricePerMToken).toBe(5.0);
    expect(pricing.provider).toBe("anthropic");
  });

  it("returns correct pricing for openai model", () => {
    const pricing = getModelPricing("gpt-4o-mini");
    expect(pricing.inputPricePerMToken).toBe(0.15);
    expect(pricing.outputPricePerMToken).toBe(0.6);
    expect(pricing.provider).toBe("openai");
  });

  it("throws for unknown model", () => {
    expect(() => getModelPricing("fake-model-xyz")).toThrowError(/Unknown model/);
  });
});

// ── listModels() ─────────────────────────────────────────────────────────────

describe("listModels()", () => {
  it("returns all models without filter", () => {
    const all = listModels();
    expect(all.length).toBeGreaterThan(10);
  });

  it("filters to anthropic only", () => {
    const models = listModels("anthropic");
    expect(models.every((m) => m.provider === "anthropic")).toBe(true);
    expect(models.length).toBeGreaterThan(0);
  });

  it("filters to openai only", () => {
    const models = listModels("openai");
    expect(models.every((m) => m.provider === "openai")).toBe(true);
    expect(models.length).toBeGreaterThan(0);
  });

  it("returns a copy (mutations don't affect internal state)", () => {
    const models = listModels();
    const originalLength = models.length;
    models.pop();
    expect(listModels().length).toBe(originalLength);
  });
});

// ── formatCost() ─────────────────────────────────────────────────────────────

describe("formatCost()", () => {
  it("formats small costs correctly", () => {
    expect(formatCost(0.001234567)).toBe("$0.001235");
  });

  it("formats zero correctly", () => {
    expect(formatCost(0)).toBe("$0.000000");
  });

  it("formats large costs correctly", () => {
    expect(formatCost(175)).toBe("$175.000000");
  });

  it("respects custom decimal places", () => {
    expect(formatCost(0.12345, 2)).toBe("$0.12");
    expect(formatCost(1.5, 4)).toBe("$1.5000");
  });

  it("prefixes with dollar sign", () => {
    expect(formatCost(1)).toMatch(/^\$/);
  });
});
