// Smoke test: AI-Modeling Data Dividend — consent → weighted token → model update
// → in-utilization → compensation epoch (allocate from profit BEFORE dividends) →
// pro-rata distribution. Runs through the gateway (:4000).
//
// Node 24 global fetch. Run:  node scripts/smoke-ai-modeling.mjs

const GW = process.env.GATEWAY_URL || "http://localhost:4000";
const j = async (method, path, body) => {
  const res = await fetch(`${GW}${path}`, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text(); let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
};
const line = (s) => console.log(s);

(async () => {
  line("\n=== CrownX AI-Modeling Data Dividend — smoke (consent · weighted token · pro-rata before dividends) ===\n");
  const USER = "smoke-user";

  // 1) no consent → contribution is skipped (gated)
  await j("POST", `/api/ai-modeling/consent/${USER}`, { aiModeling: false });
  const skip = await j("POST", "/api/ai-modeling/contribute", { holderId: USER, assetId: "ast_s1", modalities: ["photoMatch", "nfcWave"], confidence: 95 });
  line(`1. contribute without consent: ${skip.status} · skipped=${skip.data.skipped} reason=${skip.data.reason} (expect gated)`);

  // 2) grant consent → contribute a RICH capture → high weighted rate
  await j("POST", `/api/ai-modeling/consent/${USER}`, { aiModeling: true, scopes: ["capture", "sensor_fusion"] });
  const rich = await j("POST", "/api/ai-modeling/contribute", { holderId: USER, assetId: "ast_rich", modalities: ["photoMatch", "nfcWave", "hairlineDetail", "materialComposition", "thermalHeat", "uvIr", "dnaTaggant", "biometric"], confidence: 98, anomalyScore: 16, commonness: 0.05, novel: true, assetClass: "luxury" });
  const sparse = await j("POST", "/api/ai-modeling/contribute", { holderId: USER, assetId: "ast_sparse", modalities: ["photoMatch"], confidence: 80, anomalyScore: 2, commonness: 0.9, novel: false });
  line(`2. rich capture weight ${rich.data.weight?.display} vs sparse ${sparse.data.weight?.display} (rich > sparse, dynamic weighted rate)`);
  line(`   rich factors: ${(rich.data.weight?.factors || []).map((f) => `${f.factor} ${(f.contributionBps / 100).toFixed(0)}`).join(" · ")}`);

  // 3) low confidence → ineligible (never earns)
  const lowConf = await j("POST", "/api/ai-modeling/contribute", { holderId: USER, assetId: "ast_low", modalities: ["photoMatch"], confidence: 40 });
  line(`3. low-confidence contribution: eligible=${lowConf.data.eligible} (expect false — only authentic data trains)`);

  // 4) record a model improvement update → hashes the contributing tokens in
  const upd = await j("POST", "/api/ai-modeling/model-update", { version: "auth-v1.5", note: "Smoke update — luxury taggant recall." });
  line(`4. model update ${upd.data.epoch ? "" : upd.data.version} · ${upd.data.tokenIds?.length} tokens hashed in · anchored ${String(upd.data.anchorTx || "").slice(0, 14)}…`);

  // 5) deploy to live pro product → tokens become in-utilization (eligible to earn)
  const dep = await j("POST", `/api/ai-modeling/model-update/${upd.data.id}/deploy`);
  line(`5. deploy update to live pro: ${dep.status} · deployed=${dep.data.update?.deployed}`);

  // 6) revenue (the cash-flow the pool is tied to)
  await j("POST", "/api/ai-modeling/revenue", { source: "authentication_fees", cents: 1_000_000_00 });

  // 7) open a compensation epoch — pool from profit BEFORE dividends
  const ep = await j("POST", "/api/ai-modeling/epoch", {});
  line(`7. epoch: pool ${ep.data.epoch?.poolDisplay} from profit ${ep.data.epoch?.profitDisplay} · residual-for-dividends ${ep.data.residualForDividendsDisplay} · "${ep.data.note}"`);

  // 8) distribute pro-rata to in-utilization tokens, weighted
  const dist = await j("POST", `/api/ai-modeling/epoch/${ep.data.epoch?.id}/distribute`, {});
  line(`8. distribute: ${dist.status} · ${dist.data.distributedDisplay} across ${dist.data.activeTokens} live tokens · ${dist.data.byHolder?.length} holders · anchored ${String(dist.data.anchor?.txRef || "").slice(0, 14)}… (beforeShareholderDividends)`);
  (dist.data.byHolder || []).slice(0, 3).forEach((h) => line(`   · ${h.holderId}: ${h.payoutDisplay} (${h.tokens} tokens)`));

  // 9) the smoke user's dashboard reflects earnings
  const me = await j("GET", `/api/ai-modeling/user/${USER}`);
  line(`9. user dashboard: lifetime ${me.data.lifetimePaidDisplay} · ${me.data.counts?.inUtilization}/${me.data.counts?.total} live · ${me.data.shareOfPoolPct}% of pool`);

  const ok = skip.data.skipped === true && rich.data.weight?.weightBps > sparse.data.weight?.weightBps && lowConf.data.eligible === false && dep.status === 200 && ep.data.epoch?.poolCents > 0 && dist.status === 200;
  line(`\n${ok ? "✅ PASS" : "❌ CHECK"} — consent-gated, dynamically-weighted, pro-rata-before-dividends ${ok ? "verified end-to-end through the gateway" : "did not match expectations"}\n`);
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error("smoke failed:", e); process.exit(1); });
