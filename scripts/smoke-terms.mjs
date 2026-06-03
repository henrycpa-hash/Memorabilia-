// Smoke test: Terms & Agreements — transparent versioned registry, sign-up
// acceptance audit trail, and the governance + legal + COA-signoff amendment
// workflow. Runs through the gateway (:4000).
//
// Node 24 global fetch. Run:  node scripts/smoke-terms.mjs

const GW = process.env.GATEWAY_URL || "http://localhost:4000";
const j = async (method, path, body) => {
  const res = await fetch(`${GW}${path}`, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text(); let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
};
const line = (s) => console.log(s);

(async () => {
  line("\n=== CrownX Terms & Agreements — smoke (transparent registry · signed audit trail · governed amendments) ===\n");
  const USER = "smoke-signer";

  // 1) public registry — everyone can see every agreement
  const reg = await j("GET", "/api/terms");
  const keys = (reg.data.agreements || []).map((a) => a.key);
  line(`1. public registry: ${reg.status} · ${keys.length} agreements: ${keys.join(", ")}`);
  const required = ["tos", "data_ai_consent", "authenticity_risk", "royalty_vault", "smart_contracts"];
  const hasAll = required.every((k) => keys.includes(k));
  line(`   covers smart contracts + data/AI consent + authenticity risk + royalty vault: ${hasAll}`);

  // 2) full transparent text of a smart-contract agreement
  const sc = await j("GET", "/api/terms/agreement/smart_contracts");
  line(`2. smart-contract terms v${sc.data.version}: ${sc.data.sections?.length} sections · hash ${sc.data.hash?.slice(0, 14)}… · anchor ${sc.data.anchorTx?.slice(0, 14)}…`);

  // 3) sign-up acceptance → anchored audit trail
  const acc = await j("POST", "/api/terms/accept", { userId: USER, method: "passkey" });
  line(`3. sign-up acceptance: ${acc.status} · signed ${acc.data.signedCount} agreements · bundle ${acc.data.bundleHash?.slice(0, 16)}… · anchored ${acc.data.acceptance?.anchorTx?.slice(0, 14)}…`);
  const before = await j("GET", `/api/terms/acceptances/${USER}`);
  line(`   user up-to-date: ${before.data.upToDate} · needsReAcceptance: ${before.data.needsReAcceptance}`);

  // 4) governance amendment — requires governance + legal + COA sign-off
  const amd = await j("POST", "/api/terms/amendments", { key: "royalty_vault", changesNote: "Clarify donation-election lock timing.", sections: [{ heading: "1. The 10% royalty", body: "Unchanged." }, { heading: "4. Donation & lapse", body: "Donation election now locks at first resale OR 90 days, whichever is first." }] });
  line(`4. propose amendment: ${amd.status} · royalty_vault → v${amd.data.amendment?.proposedVersion} · required: ${(amd.data.requiredRoles || []).join("+")}`);
  const aid = amd.data.amendment?.id;

  // 4b) partial approval is NOT enough to activate
  await j("POST", `/api/terms/amendments/${aid}/approve`, { role: "governance", approver: "board-chair" });
  const partial = await j("POST", `/api/terms/amendments/${aid}/activate`);
  line(`4b. activate with only governance approval: ${partial.status} · ${partial.data.error} (expect blocked)`);

  // 4c) full approvals: governance + legal + COA sign-off
  await j("POST", `/api/terms/amendments/${aid}/approve`, { role: "legal", approver: "gc-counsel" });
  const final = await j("POST", `/api/terms/amendments/${aid}/approve`, { role: "coa_signoff", approver: "coa-authority" });
  line(`4c. all approvals collected: approved=${final.data.approved} · remaining=${(final.data.remaining || []).join(",") || "none"}`);

  // 5) activate → new version published on-chain
  const act = await j("POST", `/api/terms/amendments/${aid}/activate`);
  line(`5. activate: ${act.status} · ${act.data.key} now v${act.data.newVersion} · anchored ${act.data.anchorTx?.slice(0, 14)}… · "${act.data.note}"`);

  // 6) the prior signer must now re-accept (bundle changed)
  const after = await j("GET", `/api/terms/acceptances/${USER}`);
  line(`6. after amendment — signer needsReAcceptance: ${after.data.needsReAcceptance} (expect true)`);

  // 7) audit trail
  const audit = await j("GET", "/api/terms/audit");
  line(`7. audit trail: ${audit.data.totalAcceptances} signatures · ${audit.data.amendments?.length} amendments · royalty_vault versions: ${audit.data.agreements?.find((a) => a.key === "royalty_vault")?.versions?.length}`);

  const ok = hasAll && acc.status === 200 && partial.status === 409 && final.data.approved === true && act.status === 200 && after.data.needsReAcceptance === true;
  line(`\n${ok ? "✅ PASS" : "❌ CHECK"} — transparent registry, signed audit trail, governed amendment ${ok ? "verified end-to-end through the gateway" : "did not match expectations"}\n`);
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error("smoke failed:", e); process.exit(1); });
