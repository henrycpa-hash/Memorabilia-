// Smoke test: Royalty Vault — the held-until-claim treasury connected to athlete accounts.
// Runs through the gateway (:4000) so it also proves the /api/royalty-vault/* proxies.
//
//   register COA -> settle a resale (10% split, athlete slice HELD) -> athlete vault
//   -> verify & claim (held releases) -> settle again (now pays direct) -> subscribe
//   -> donation election -> sell-quote.
//
// Node 24 global fetch. Run:  node scripts/smoke-royalty-vault.mjs

const GW = process.env.GATEWAY_URL || "http://localhost:4000";

const j = async (method, path, body) => {
  const res = await fetch(`${GW}${path}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
};

const line = (s) => console.log(s);
const money = (v) => (typeof v === "string" ? v : JSON.stringify(v));

(async () => {
  line("\n=== CrownX Royalty Vault — smoke (held-until-claim, connected to athlete account) ===\n");

  // 0) scenarios are published
  const sc = await j("GET", "/api/royalty-vault/scenarios");
  line(`0. scenarios published: ${sc.status} (${(sc.data.scenarios || []).length} scenarios)`);

  // a fresh athlete account for this run so the claim math is deterministic
  const ATHLETE = "smoke-athlete";
  const ASSET = "smoke-asset-1";

  // 1) register the asset's royalty config at mint (GenesisCOA struct)
  const coa = await j("POST", "/api/royalty-vault/coa", {
    assetId: ASSET, originatorId: "fan-origin-1", athleteId: ATHLETE, scenario: "default", fanTier: "free", athleteTier: "free"
  });
  line(`1. register COA: ${coa.status} · shares orig/ath/crownx = ${coa.data.shares?.origShareBps}/${coa.data.shares?.athleteShareBps}/${coa.data.shares?.crownxShareBps} bps · anchored ${coa.data.anchor?.txRef?.slice(0, 14)}…`);

  // 2) settle a $10,000 resale — athlete slice should be HELD (not yet claimed)
  const s1 = await j("POST", "/api/royalty-vault/settle", { assetId: ASSET, salePriceCents: 1000000 });
  line(`2. settle resale $10,000: ${s1.status} · royalty ${money(s1.data.settlement?.royalty)} → orig ${money(s1.data.settlement?.originator)} / athlete ${money(s1.data.settlement?.athlete)} / crownx ${money(s1.data.settlement?.crownx)} · athleteStatus=${s1.data.athleteStatus}`);
  if (s1.data.athleteStatus !== "held") line("   ⚠ expected athleteStatus=held before claim");

  // 3) the athlete's vault now shows a held balance (the "royalties waiting" hook)
  const v1 = await j("GET", `/api/royalty-vault/athlete/${ATHLETE}`);
  line(`3. athlete vault: held=${money(v1.data.display?.held)} claimedLifetime=${money(v1.data.display?.claimedLifetime)} pieces=${v1.data.pieceCount} claimed=${v1.data.claimed}`);

  // 4) verify & claim (biometric) — held releases to the athlete account
  const cl = await j("POST", `/api/royalty-vault/athlete/${ATHLETE}/claim`, { method: "biometric" });
  line(`4. verify & claim: ${cl.status} · released ${money(cl.data.releasedDisplay)} · claimed=${cl.data.vault?.claimed} · anchored ${cl.data.anchor?.txRef?.slice(0, 14)}…`);

  // 5) settle ANOTHER resale — now that the athlete is verified, it pays DIRECT
  const s2 = await j("POST", "/api/royalty-vault/settle", { assetId: ASSET, salePriceCents: 1500000 });
  line(`5. settle resale $15,000 (post-claim): ${s2.status} · athlete ${money(s2.data.settlement?.athlete)} · athleteStatus=${s2.data.athleteStatus} (expect paid)`);

  // 6) athlete subscribes to raise their share
  const sub = await j("POST", `/api/royalty-vault/athlete/${ATHLETE}/subscribe`, { tier: "elite" });
  line(`6. subscribe ELITE: ${sub.status} · new athlete share ${money(sub.data.share)} · itemsUpdated=${sub.data.itemsUpdated}`);

  // 7) donation election — locks after first resale (this asset already resold → expect lock)
  const don = await j("POST", `/api/royalty-vault/athlete/${ATHLETE}/donation`, { assetId: ASSET, elect: true });
  line(`7. donation on resold asset: ${don.status} · ${money(don.data.error || don.data.donationElected)} (expect locked 409)`);

  // 8) sell the held stream — FMV buyout quote
  const sell = await j("GET", `/api/royalty-vault/athlete/${ATHLETE}/sell-quote`);
  line(`8. sell-stream quote: ${sell.status} · offer ${money(sell.data.offerDisplay)} basis ${money(sell.data.basisDisplay)}`);

  // 9) connection to a real athlete account (seeded held balance) — dylan-crews
  const dc = await j("GET", "/api/royalty-vault/athlete/dylan-crews");
  line(`9. connected athlete dylan-crews: held=${money(dc.data.display?.held)} across ${dc.data.pieceCount} pieces (funnel hook)`);

  const ok = coa.status === 201 && s1.data.athleteStatus === "held" && cl.status === 200 && s2.data.athleteStatus === "paid";
  line(`\n${ok ? "✅ PASS" : "❌ CHECK"} — held→claim→direct flywheel ${ok ? "verified end-to-end through the gateway" : "did not match expectations"}\n`);
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error("smoke failed:", e); process.exit(1); });
