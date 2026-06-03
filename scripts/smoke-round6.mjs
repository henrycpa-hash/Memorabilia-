const GW = process.env.GATEWAY_URL || "http://localhost:4000";
const get = (p) => fetch(`${GW}${p}`).then((r) => r.json());
const post = (p, b) => fetch(`${GW}${p}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b || {}) }).then((r) => r.json());

const aid = (await get("/api/athletes"))[0].id;

console.log("=== A. CONTRACT → DCF (CrownX-verified before valuation) ===");
const before = await get(`/api/athletes/${aid}`);
console.log(`   price before: ${before.priceDisplay} (contracts DCF ${before.contractsDcfCents === 0 ? "$0" : before.contractsDcfCents})`);
const up = await post(`/api/athletes/${aid}/contracts`, { counterparty: "Apex Sportswear", kind: "nil", annualValueCents: 120000000, termYears: 4 });
console.log(`   uploaded NIL contract — projected DCF ${up.projectedDcfDisplay}, verified=${up.contract.verified} (not yet in valuation)`);
const v = await post(`/api/athletes/${aid}/contracts/${up.contract.id}/verify`);
console.log(`   ✓ verified on-chain ${v.anchor.txRef.slice(0, 18)}… → contract DCF now ${v.contractsDcfDisplay}`);
const after = await get(`/api/athletes/${aid}`);
console.log(`   price after verify: ${after.priceDisplay} (elasticity ${after.index.elasticityFactor}x)`);

console.log("=== B. ELASTICITY (a 40k-share buy lifts the price) ===");
await post(`/api/athletes/${aid}/fractions/buy`, { userId: "whale", shares: 40000 });
const elastic = await get(`/api/athletes/${aid}`);
console.log(`   price ${elastic.priceDisplay} · demandPressure ${elastic.demandPressure.toFixed(2)} · elasticity ${elastic.index.elasticityFactor}x`);

console.log("=== C. AUDIT PACKAGE (auditor/regulator-ready, real-time) ===");
const pkg = await get(`/api/athletes/${aid}/audit-package`);
console.log(`   valuation ${pkg.valuation.marketCapDisplay} · contracts ${pkg.contracts.verified}/${pkg.contracts.total} verified (${pkg.contracts.verifiedDcfDisplay}) · ${pkg.royalties.count} royalty anchors · attestation ${pkg.attestation.txRef.slice(0, 18)}… · ${pkg.provenance.sigScheme}`);

console.log("=== D. INSURANCE VERIFY (theft coverage can bind) ===");
const ins = await get(`/api/athletes/${aid}/insurance-verify/ast_jersey`);
console.log(`   authenticity ${ins.authenticity} · valuation ${ins.valuationDisplay} · attestation ${ins.attestation.txRef.slice(0, 18)}…`);

console.log("=== E. SOVEREIGNTY consent/redaction on the owner chain ===");
await post(`/api/athletes/${aid}/royalty-event`, { assetId: "ast_legacy", fromUserId: "fan_alice", toUserId: "fan_bob", salePriceCents: 4200000 });
await post(`/api/athletes/${aid}/legacy/ast_legacy/consent`, { userId: "fan_alice", redacted: true });
const chain = await get(`/api/athletes/${aid}/legacy/ast_legacy`);
console.log(`   chain (alice redacted): ${chain.hops.map((h) => h.userId).join(" → ")}`);

console.log("=== F. PACK-N-SHIP escrow flow (COA-gated release) ===");
const t = await post("/api/trades", { assetId: "ast_jersey1", sellerId: "seller_ava", buyerId: "buyer_max", priceCents: 4200000 });
let tid = t.id;
for (const s of ["pay", "package", "ship", "delivered"]) {
  const r = await post(`/api/trades/${tid}/${s}`);
  console.log(`   ${s} → ${r.state}${r.packCoa ? " ·" + r.packCoa : ""}${r.shipCoa ? " ·" + r.shipCoa : ""}${r.tracking ? " [" + r.tracking.status + "]" : ""}`);
}
const auth = await post(`/api/trades/${tid}/authenticate`);
console.log(`   authenticate → state=${auth.state} · AI conf ${auth.ai?.confidence} · Genesis COA ${auth.genesisCoa || "-"} · COA released ${auth.coaReleased} · funds released ${auth.fundsReleased}`);

console.log("=== G. NO-RESPONSE INVESTIGATION (connected-accounts + anomaly) ===");
await post("/api/invites", { inviterId: "seller_x", inviteeId: "buyer_y" });
const t2 = await post("/api/trades", { assetId: "ast_b", sellerId: "seller_x", buyerId: "buyer_y", priceCents: 3000000 });
for (const s of ["pay", "package", "ship", "delivered"]) await post(`/api/trades/${t2.id}/${s}`);
const inv = await post(`/api/trades/${t2.id}/investigate`);
console.log(`   decision=${inv.decision} · checks=${JSON.stringify(inv.checks)}`);
