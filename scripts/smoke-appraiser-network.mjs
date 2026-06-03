// Smoke test: Appraiser NETWORK — choose an appraiser, who then cryptographically
// signs (authenticates) their report. Runs through the gateway (:4000).
//
//   list network -> request appraisal CHOOSING an appraiser (assigned) ->
//   accept assignment -> sign & submit report -> verify signature (authentic) ->
//   latest-appraisal on the exchange -> assignment guard (stranger blocked).
//
// Node 24 global fetch. Run:  node scripts/smoke-appraiser-network.mjs

const GW = process.env.GATEWAY_URL || "http://localhost:4000";
const j = async (method, path, body) => {
  const res = await fetch(`${GW}${path}`, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text(); let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
};
const line = (s) => console.log(s);

(async () => {
  line("\n=== CrownX Appraiser Network — smoke (choose appraiser + authenticated signed report) ===\n");

  // pick an athlete from the exchange
  const list = await j("GET", "/api/athletes");
  const athletes = Array.isArray(list.data) ? list.data : list.data.athletes || [];
  const athlete = athletes[0];
  const athleteId = athlete.slug || athlete.id;
  line(`0. exchange athlete: ${athlete.name} (${athleteId})`);

  // 1) the appraiser network roster
  const net = await j("GET", "/api/appraisers");
  const roster = net.data.appraisers || [];
  line(`1. appraiser network: ${net.status} · ${roster.length} certified appraisers`);
  roster.slice(0, 3).forEach((a) => line(`   · ${a.name} (${a.firm}) ★${a.rating} · ${a.credential}${a.credentialVerified ? " ✓" : ""} · ${a.feeDisplay} · ${a.turnaroundDisplay}`));
  const chosen = roster[2] || roster[0];

  // 2) request an appraisal CHOOSING that appraiser → assigned
  const req = await j("POST", `/api/athletes/${athleteId}/appraisal`, { assetId: `ast_${athleteId}_smoke`, requestedBy: "henry", appraiserId: chosen.id });
  line(`2. request → choose ${chosen.name}: ${req.status} · status=${req.data.status} · assignedTo=${req.data.appraiser?.name} · fee ${req.data.appraiser?.feeDisplay}`);
  const appraisalId = req.data.appraisalId;

  // 3) a DIFFERENT appraiser must NOT be able to claim an assigned job
  const stranger = roster.find((a) => a.id !== chosen.id);
  const blocked = await j("POST", `/api/appraisals/${appraisalId}/claim`, { appraiserId: stranger.id });
  line(`3. stranger ${stranger.name} claims assigned job: ${blocked.status} · ${blocked.data.error || "unexpectedly allowed"} (expect 403)`);

  // 4) the chosen appraiser accepts the assignment
  const claim = await j("POST", `/api/appraisals/${appraisalId}/claim`, { appraiserId: chosen.id });
  line(`4. ${chosen.name} accepts: ${claim.status} · status=${claim.data.appraisal?.status}`);

  // 5) the appraiser SIGNS (authenticates) and submits the report
  const sub = await j("POST", `/api/appraisals/${appraisalId}/submit`, { appraiserId: chosen.id, appraisedValueCents: 5_250_000, notes: "Examined in person; consistent with stated grade.", report: { condition: "Mint, no restoration", statement: "Fair value $52,500 — supported by 3 graded comps." } });
  line(`5. sign & submit: ${sub.status} · ${sub.data.appraisal?.appraisedDisplay} · authenticatedBy=${sub.data.signature?.authenticatedBy} · scheme=${sub.data.signature?.scheme}`);
  line(`   signature ${String(sub.data.signature?.value || "").slice(0, 22)}… · reportHash ${String(sub.data.signature?.reportHash || "").slice(0, 18)}… · anchored ${sub.data.anchor?.txRef?.slice(0, 14)}…`);

  // 6) anyone can VERIFY the appraiser authenticated this report
  const ver = await j("GET", `/api/appraisals/${appraisalId}/verify`);
  line(`6. verify signature: ${ver.status} · authentic=${ver.data.valid} · signedBy=${ver.data.appraiser?.name} (${ver.data.appraiser?.credential}) · key ${ver.data.appraiser?.publicKey} · tampered=${ver.data.reportTampered}`);

  // 7) the signed result surfaces on the exchange (athlete detail)
  const latest = await j("GET", `/api/athletes/${athleteId}/latest-appraisal`);
  line(`7. exchange latest-appraisal: ${latest.status} · ${latest.data.appraisedDisplay} by ${latest.data.appraiserName} (${latest.data.firm}) · authenticated=${latest.data.authenticated}`);

  const ok = net.status === 200 && req.data.status === "assigned_to_appraiser" && blocked.status === 403 && sub.status === 200 && ver.data.valid === true && latest.data.authenticated === true;
  line(`\n${ok ? "✅ PASS" : "❌ CHECK"} — choose-appraiser + authenticated signed report ${ok ? "verified end-to-end through the gateway" : "did not match expectations"}\n`);
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error("smoke failed:", e); process.exit(1); });
