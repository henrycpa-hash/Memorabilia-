import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeDataWeight,
  allocatePool,
  distributeCompensation,
  DEFAULT_BOARD_ALLOC_BPS,
  MAX_BOARD_ALLOC_BPS,
  MIN_ELIGIBLE_CONFIDENCE,
  type DataContributionToken
} from "../packages/shared-datadividend/src/index.ts";

test("a rich, rare, novel capture outweighs a sparse common one", () => {
  const rich = computeDataWeight({ modalities: ["photoMatch", "nfcWave", "hairlineDetail", "materialComposition", "thermalHeat", "uvIr", "dnaTaggant", "biometric"], confidence: 98, anomalyScore: 16, commonness: 0.05, novel: true });
  const sparse = computeDataWeight({ modalities: ["photoMatch"], confidence: 80, anomalyScore: 2, commonness: 0.9, novel: false });
  assert.ok(rich.weightBps > sparse.weightBps, "rich > sparse");
  assert.ok(rich.matrixCoverage > sparse.matrixCoverage);
  assert.ok(rich.rarity > sparse.rarity);
});

test("low confidence is ineligible (only authentic data trains)", () => {
  const w = computeDataWeight({ modalities: ["photoMatch"], confidence: MIN_ELIGIBLE_CONFIDENCE - 1 });
  assert.equal(w.eligible, false);
});

test("board allocation defaults to 3% and is capped at the 5% ceiling", () => {
  assert.equal(DEFAULT_BOARD_ALLOC_BPS, 300);
  assert.equal(MAX_BOARD_ALLOC_BPS, 500);
  const at3 = allocatePool(1_000_000, 300);
  assert.equal(at3.poolCents, 30_000); // 3%
  const requested8 = allocatePool(1_000_000, 800);
  assert.equal(requested8.boardAllocBps, 500, "capped at the 5% ceiling");
  assert.equal(requested8.cappedAtMax, true);
});

test("pool distributes pro-rata by weight only to in-utilization tokens", () => {
  const tokens: DataContributionToken[] = [
    { id: "a", holderId: "henry", assetId: "x", weightBps: 12000, mintedAt: "", inUtilization: true },
    { id: "b", holderId: "raul", assetId: "y", weightBps: 6000, mintedAt: "", inUtilization: true },
    { id: "c", holderId: "eric", assetId: "z", weightBps: 9000, mintedAt: "", inUtilization: false } // not deployed → earns nothing
  ];
  const { payouts, distributedCents } = distributeCompensation(tokens, 90_000);
  assert.equal(payouts.length, 2, "only the 2 in-utilization tokens earn");
  const henry = payouts.find((p) => p.holderId === "henry")!;
  const raul = payouts.find((p) => p.holderId === "raul")!;
  assert.ok(henry.payoutCents > raul.payoutCents, "higher weight earns more");
  assert.ok(distributedCents <= 90_000);
});

test("guards: zero pool or no active tokens distributes nothing", () => {
  const tokens: DataContributionToken[] = [{ id: "a", holderId: "h", assetId: "x", weightBps: 10000, mintedAt: "", inUtilization: false }];
  assert.equal(distributeCompensation(tokens, 100_000).payouts.length, 0);
  const active: DataContributionToken[] = [{ id: "a", holderId: "h", assetId: "x", weightBps: 10000, mintedAt: "", inUtilization: true }];
  assert.equal(distributeCompensation(active, 0).distributedCents, 0);
});
