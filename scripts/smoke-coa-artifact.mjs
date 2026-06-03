// Smoke test: Genesis COA Artifact — the dynamic 3D/4D certificate.
// Runs through the gateway (:4000) so it also proves the /api/coa-artifact/* proxies.
//
//   list seeded COAs -> fetch full artifact (dual-pane + layers + anchors)
//   -> unlock a public layer -> open an AR/VR (WebXR) session -> log a gesture
//   -> issue a fresh COA (mint path) -> verify it is viewable.
//
// Node 24 global fetch. Run:  node scripts/smoke-coa-artifact.mjs

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

(async () => {
  line("\n=== CrownX Genesis COA Artifact — smoke (3D/4D dual-pane + unlockables + AR/VR) ===\n");

  // 1) the market/feed gallery of viewable COAs
  const list = await j("GET", "/api/coa-artifact?limit=10");
  const arts = list.data.artifacts || [];
  line(`1. COA gallery: ${list.status} · ${arts.length} artifacts · ${list.data.stats?.totalViews} total views`);
  const first = arts[0];
  if (!first) { line("❌ no seeded artifacts"); process.exit(1); }
  line(`   first: ${first.title} · ${first.coaNumber} · xrViewable=${first.xrViewable}`);

  // 2) the full artifact — dual-pane + 3D layer stack + anchors
  const full = await j("GET", `/api/coa-artifact/${first.id}`);
  const a = full.data;
  line(`2. full artifact: ${full.status} · paneA overlays nonce=${a.paneA?.overlays?.rollingNonce?.slice(-6)} · paneB chain=${a.anchors?.blockchain?.chain}`);
  line(`   3D layers: ${(a.layers3d || []).length} · identifiers present ${(a.identifiers || []).filter((i) => i.present).length}/${(a.identifiers || []).length} · overlayValid=${a.overlayCheck?.valid} · xrViewable=${a.xrViewable}`);
  line(`   descriptor: ${(a.descriptor?.imperfections || []).length} imperfections · vector dims ${(a.descriptor?.canonicalVector || []).length} · entropy ${a.anchors?.entropyScore?.toFixed?.(4)}`);

  // 3) §3 unlock a PUBLIC gamified layer (non-owner allowed) → tamper-proof record
  const pub = (a.layers || []).find((l) => !l.ownerOnly);
  const unl = await j("POST", `/api/coa-artifact/${first.id}/unlock`, { layerId: pub.id, userId: "viewer-1", wallet: "0xviewer" });
  line(`3. unlock public layer "${pub.title}": ${unl.status} · unlocked=${unl.data.layer?.unlocked} · proof ${String(unl.data.record?.proof || "").slice(0, 28)}…`);

  // 3b) §3 owner-only layer should be BLOCKED for a non-owner (403)
  const own = (a.layers || []).find((l) => l.ownerOnly);
  const blocked = await j("POST", `/api/coa-artifact/${first.id}/unlock`, { layerId: own.id, userId: "not-the-owner", wallet: "0xstranger" });
  line(`3b. owner-only "${own.title}" for stranger: ${blocked.status} · ${blocked.data.error || "unexpectedly allowed"} (expect 403 owner_only)`);

  // 4) §2 open an immersive AR/VR (WebXR) session — Meta Quest
  const xr = await j("POST", `/api/coa-artifact/${first.id}/xr-session`, { mode: "immersive-vr", device: "Meta Quest", userId: "viewer-1" });
  line(`4. open VR session: ${xr.status} · device=${xr.data.session?.device} · mode=${xr.data.session?.mode} · token ${xr.data.sessionToken} · authFlow "${xr.data.xr?.authFlow}"`);
  const sid = xr.data.session?.id;

  // 4b) §2 log a gesture inside the session (cryptographically logged)
  const g = await j("POST", `/api/coa-artifact/xr/${sid}/gesture`, { gesture: "rotate" });
  line(`4b. log gesture: ${g.status} · gestures=${g.data.gestures} · anchored ${String(g.data.anchor || "").slice(0, 14)}…`);

  // 5) issue a fresh COA (the mint path) and confirm it is viewable
  const issue = await j("POST", "/api/coa-artifact", {
    tokenId: "tok_smoke_xyz", coaNumber: "CXG-SMOKE01", title: "Smoke Test Piece · 1/1", assetType: "memorabilia",
    ownerUserId: "henry", fingerprintHash: "keccak512:smoke", sessionDna: "dna-smoke-seed", anchorTxRef: "0xsmoke", anchorBlock: "1", anchorChain: "crownx-genesis", confidence: 97
  });
  line(`5. issue COA (mint path): ${issue.status} · id ${issue.data.artifact?.id} · kind ${issue.data.artifact?.kind} · anchored ${issue.data.anchor?.txRef?.slice(0, 14)}…`);

  const ok = list.status === 200 && full.status === 200 && unl.status === 200 && blocked.status === 403 && xr.status === 200 && issue.status === 201;
  line(`\n${ok ? "✅ PASS" : "❌ CHECK"} — Genesis COA 3D/4D + AR/VR ${ok ? "verified end-to-end through the gateway" : "did not match expectations"}\n`);
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error("smoke failed:", e); process.exit(1); });
