import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  // Bundle the JSON pricing data into the output
  loader: { ".json": "json" },
  // Keep bundle self-contained
  noExternal: ["./model_prices.json"],
});
