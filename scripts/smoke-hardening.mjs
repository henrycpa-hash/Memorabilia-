// Smoke test: production hardening across all CrownX engines.
//   · unknown routes return clean JSON 404 (global notFound handler)
//   · malformed financial input is rejected with 400 (not NaN-poisoned 200/500)
//   · valid input still succeeds
// Run:  node scripts/smoke-hardening.mjs

const GW = process.env.GATEWAY_URL || "http://localhost:4000";
const J = async (m, p, b) => {
  try {
    const r = await fetch(`${GW}${p}`, { method: m, headers: b ? { "content-type": "application/json" } : undefined, body: b ? JSON.stringify(b) : undefined });
    const t = await r.text(); let d; try { d = JSON.parse(t); } catch { d = t; }
    return { status: r.status, data: d };
  } catch (e) { return { status: 0, data: String(e) }; }
};
const D = async (port, path) => {
  try { const r = await fetch(`http://localhost:${port}${path}`); const t = await r.text(); let d; try { d = JSON.parse(t); } catch { d = t; } return { status: r.status, data: d }; }
  catch (e) { return { status: 0, data: String(e) }; }
};
const line = (s) => console.log(s);
let fails = 0;
const expect = (label, got, want) => { const ok = got === want; if (!ok) fails++; line(`  ${ok ? "✓" : "✗"} ${label}: ${got} (want ${want})`); };

(async () => {
  line("\n=== CrownX production-hardening smoke ===\n");

  line("1. global 404 handler returns clean JSON per engine");
  for (const [port, nm] of [[4073, "xp"], [4076, "athlete-index"], [4077, "pack-n-ship"], [4078, "auth-engine"], [4079, "network-feed"], [4080, "royalty-vault"], [4081, "coa-artifact"]]) {
    const r = await D(port, "/__no_such_route__");
    const ok = r.status === 404 && r.data && r.data.error === "route_not_found";
    if (!ok) fails++;
    line(`  ${ok ? "✓" : "✗"} ${nm}: ${r.status} ${r.data?.error || ""}`);
  }

  line("2. malformed financial input → 400 (NaN / negative / zero / bad enum)");
  expect("royalty settle salePriceCents='abc'", (await J("POST", "/api/royalty-vault/settle", { assetId: "ast_dylan-crews_0", salePriceCents: "abc" })).status, 400);
  expect("royalty settle negative", (await J("POST", "/api/royalty-vault/settle", { assetId: "ast_dylan-crews_0", salePriceCents: -500 })).status, 400);
  expect("pack-n-ship trade priceCents NaN", (await J("POST", "/api/trades", { assetId: "a", sellerId: "s", buyerId: "b", priceCents: "xyz" })).status, 400);
  expect("athlete order shares=0", (await J("POST", "/api/athletes/dylan-crews/orders", { userId: "u", side: "buy", shares: 0, limitPriceCents: 100 })).status, 400);
  expect("athlete order bad side", (await J("POST", "/api/athletes/dylan-crews/orders", { userId: "u", side: "hack", shares: 5, limitPriceCents: 100 })).status, 400);
  expect("athlete fractions buy shares=-3", (await J("POST", "/api/athletes/dylan-crews/fractions/buy", { userId: "u", shares: -3 })).status, 400);
  expect("feed bid amount=-5", (await J("POST", "/api/feed/whatever/bid", { userId: "u", amountCents: -5 })).status, 400);
  expect("appraisal submit value='free'", (await J("POST", "/api/appraisals/none/submit", { appraiserId: "apr_jordan", appraisedValueCents: "free" })).status, 400);

  line("3. valid input still succeeds");
  expect("royalty settle valid 200", (await J("POST", "/api/royalty-vault/settle", { assetId: "ast_dylan-crews_0", salePriceCents: 1000000 })).status, 200);

  line(`\n${fails === 0 ? "✅ PASS" : `❌ ${fails} CHECK(S) FAILED`} — engines reject bad input + return clean errors\n`);
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => { console.error("smoke failed:", e); process.exit(1); });
