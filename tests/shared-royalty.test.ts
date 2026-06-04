import { test } from "node:test";
import assert from "node:assert/strict";
import { computeShares, settleSale, ROYALTY_RATE_BPS, PROTOCOL_FLOOR_BPS, checkInvariants } from "../packages/shared-royalty/src/index.ts";

test("royalty rate is a fixed 10%", () => {
  assert.equal(ROYALTY_RATE_BPS, 1000);
});

test("default scenario splits fan/athlete/crownx and sums to 100% of the pool", () => {
  const s = computeShares("default", "free", "free");
  assert.equal(s.origShareBps + s.athleteShareBps + s.crownxShareBps, 10000);
  assert.ok(s.crownxShareBps >= PROTOCOL_FLOOR_BPS, "CrownX keeps the protocol floor");
  assert.ok(checkInvariants(s));
});

test("settleSale takes 10% royalty and seller nets the rest", () => {
  const shares = computeShares("default", "free", "free");
  const st = settleSale(1_000_000, shares); // $10,000 sale
  assert.equal(st.royaltyCents, 100_000); // 10%
  assert.equal(st.sellerNetsCents, 900_000);
  assert.equal(st.toOriginatorCents + st.toAthleteCents + st.toCrownxCents, st.royaltyCents);
});

test("athlete_originated gives the athlete the larger share, never below the floor for CrownX", () => {
  const s = computeShares("athlete_originated", "free", "elite");
  assert.ok(s.athleteShareBps > s.origShareBps);
  assert.ok(s.crownxShareBps >= PROTOCOL_FLOOR_BPS);
  assert.ok(checkInvariants(s));
});
