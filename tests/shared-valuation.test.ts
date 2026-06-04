import { test } from "node:test";
import assert from "node:assert/strict";
import { computeAthleteIndex, type AthleteSignals } from "../packages/shared-valuation/src/index.ts";

const base: AthleteSignals = { onFieldPerformance: 80, offFieldConduct: 80, pressSentiment: 60, royaltyDcfCents: 8_000_000_00, tradeVelocity: 30, marketSupply: 400, socialReach: 1_000_000 };
const opts = { sharesOutstanding: 1_000_000, demandPressure: 0 };

test("index produces a positive price-per-share and market cap", () => {
  const idx = computeAthleteIndex(base, opts);
  assert.ok(idx.marketCapCents > 0);
  assert.ok(idx.pricePerShareCents > 0);
  assert.ok(idx.brandScore >= 0 && idx.brandScore <= 100);
});

test("a higher royalty-DCF floor raises the valuation", () => {
  const low = computeAthleteIndex(base, opts);
  const high = computeAthleteIndex({ ...base, royaltyDcfCents: base.royaltyDcfCents * 2 }, opts);
  assert.ok(high.marketCapCents > low.marketCapCents);
});

test("stronger brand signals raise the brand score", () => {
  const weak = computeAthleteIndex({ ...base, onFieldPerformance: 20, pressSentiment: 10, socialReach: 50_000 }, opts);
  const strong = computeAthleteIndex({ ...base, onFieldPerformance: 99, pressSentiment: 95, socialReach: 5_000_000 }, opts);
  assert.ok(strong.brandScore > weak.brandScore);
});

test("demand pressure lifts the price (elasticity)", () => {
  const flat = computeAthleteIndex(base, { ...opts, demandPressure: 0 });
  const pressured = computeAthleteIndex(base, { ...opts, demandPressure: 0.5 });
  assert.ok(pressured.pricePerShareCents >= flat.pricePerShareCents);
});
