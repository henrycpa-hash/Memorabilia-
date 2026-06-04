import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildGenesisCoa,
  unlockLayer,
  resealOnTransfer,
  coaLayers,
  verifyOverlays,
  COA_ROYALTY_RATE_BPS
} from "../packages/shared-coa/src/index.ts";

function sample() {
  return buildGenesisCoa({
    id: "coa_test", tokenId: "tok_test123456", coaNumber: "CXG-TEST", title: "Test Piece", assetType: "memorabilia",
    ownerUserId: "henry", fingerprintHash: "keccak512:deadbeefdeadbeef", sessionDna: "dna-seed-123456",
    anchorTxRef: "0xabc123", anchorBlock: "cxg-1", anchorChain: "crownx-genesis", confidence: 96, createdAt: "2026-06-04T00:00:00Z"
  });
}

test("builds a dual-pane artifact with overlays, anchors, identifiers, layers, XR", () => {
  const a = sample();
  assert.equal(a.kind, "genesis");
  assert.ok(a.paneA.overlays.rollingNonce.length > 4);
  assert.ok(a.paneB.timestampRfc3161);
  assert.equal(a.identifiers.length, 15);
  assert.ok(a.layers.length >= 4);
  assert.ok(a.xr.modes.includes("immersive-ar") && a.xr.modes.includes("immersive-vr"));
  assert.equal(a.iso20022.royalty.rateBps, COA_ROYALTY_RATE_BPS);
  assert.ok(verifyOverlays(a.paneA).valid);
});

test("NaN confidence is clamped, not propagated", () => {
  const a = buildGenesisCoa({ id: "c", tokenId: "tok_x", coaNumber: "C", title: "t", ownerUserId: "u", fingerprintHash: "k:1234567890", sessionDna: "dna12345", anchorTxRef: "0x1", anchorBlock: "1", anchorChain: "c", confidence: Number.NaN, createdAt: "2026-06-04T00:00:00Z" });
  assert.ok(Number.isFinite(a.confidence));
  assert.ok(a.confidence >= 0 && a.confidence <= 100);
});

test("owner-only layers require the owner; public layers unlock for anyone", () => {
  const a = sample();
  const ownerOnly = a.layers.find((l) => l.ownerOnly)!;
  const pub = a.layers.find((l) => !l.ownerOnly)!;
  assert.equal(unlockLayer(a, ownerOnly.id, { wallet: "0xstranger", userId: "stranger" }, "2026-06-04T01:00:00Z").ok, false);
  assert.equal(unlockLayer(a, pub.id, { wallet: "0xv", userId: "viewer" }, "2026-06-04T01:00:00Z").ok, true);
  assert.equal(unlockLayer(a, ownerOnly.id, { wallet: "0xh", userId: "henry" }, "2026-06-04T01:00:00Z").ok, true);
});

test("transfer re-seals non-persistent unlocked layers", () => {
  const a = sample();
  for (const l of a.layers) l.unlocked = true;
  resealOnTransfer(a, "newowner");
  assert.equal(a.ownerUserId, "newowner");
  const reSealed = a.layers.filter((l) => !l.persistsAcrossTransfer);
  assert.ok(reSealed.every((l) => !l.unlocked), "non-persistent layers re-sealed");
});

test("coaLayers yields a front (capture) and back (provenance) face", () => {
  const layers = coaLayers(sample());
  assert.ok(layers.some((l) => l.face === "front" && l.kind === "live_capture"));
  assert.ok(layers.some((l) => l.face === "back" && l.kind === "provenance"));
});
