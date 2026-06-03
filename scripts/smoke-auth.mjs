const GW = process.env.GATEWAY_URL || "http://localhost:4000";
const get = (p) => fetch(`${GW}${p}`).then((r) => r.json());
const post = (p, b) => fetch(`${GW}${p}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b || {}) }).then((r) => r.json());

for (let i = 0; i < 25; i++) { try { if ((await fetch(`${GW}/health`)).ok && (await fetch("http://localhost:4078/health")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 1500)); }

console.log("=== aggregate health (now includes authEngine) ===");
const h = await get("/api/health");
console.log("  ok=" + h.ok, Object.entries(h.services).map(([k, v]) => k + ":" + v).join(" "));

console.log("=== AI reference data sources (PSA / Beckett / JSA / WorthPoint / eBay) ===");
const src = await get("/api/auth/training-sources");
console.log("  " + src.sources.map((s) => s.name).join(" · "));

// a real demo user so XP/rank is live
const reg = await post("/api/register", { email: `minter+${Date.now()}@crownx.ai`, displayName: "Minter", password: "CrownXDemo!2026", role: "creator" });
const uid = JSON.parse(Buffer.from(reg.accessToken.split(".")[1], "base64").toString()).sub;

const auth = { photoMatch: 96, nfcWave: 98, wifiReflection: 90, thermalHeat: 92, materialComposition: 95, hairlineDetail: 97, triCode: true, liveness: 95, biometric: 94, eventCorrelation: 93 };
const sources = { psaSignatureGrade: 9, beckettGuideCents: 380000, jsaVerified: true, worthpointMedianCents: 420000, ebaySoldCompsCents: [390000, 440000, 410000, 520000], rarity: 78 };

console.log("=== LIVE-CAPTURE → AUTHENTICATE → MINT (authentic) → rank climb ===");
const r1 = await post("/api/auth/mint", { userId: uid, title: "Game-Worn Finals Jersey", assetType: "memorabilia", sensors: auth, priceSources: sources });
console.log(`  fusion confidence ${r1.fusion.confidence}% · anomaly ${r1.fusion.anomalyScore} · tri-code ${r1.fusion.triCode}`);
console.log(`  hairline ${r1.fusion.contributions.find((c) => c.modality === "hairlineDetail").score} · material ${r1.fusion.contributions.find((c) => c.modality === "materialComposition").score} · photo ${r1.fusion.contributions.find((c) => c.modality === "photoMatch").score} · NFC ${r1.fusion.contributions.find((c) => c.modality === "nfcWave").score}`);
console.log(`  VERDICT: ${r1.verdict.decision.toUpperCase()} → COA ${r1.coa?.coaNumber} · fingerprint ${r1.fingerprint?.fingerprintHash.slice(0, 24)}… · L2 ${r1.provenance?.l2TxHash.slice(0, 14)}…`);
console.log(`  weighted value ${r1.price.valueDisplay} (${r1.price.confidence}% data confidence)`);
console.log(`  RANK CLIMB: +${r1.xp?.gained} VXP → LV${r1.xp?.level} ${r1.xp?.tier}${r1.xp?.leveledUp ? " (LEVELED UP)" : ""}`);

console.log("=== second authenticated mint → rank keeps climbing ===");
const r2 = await post("/api/auth/mint", { userId: uid, title: "Signed Debut Card", sensors: { ...auth, hairlineDetail: 99, materialComposition: 98 }, priceSources: sources });
console.log(`  ${r2.verdict.decision.toUpperCase()} · +${r2.xp?.gained} VXP → LV${r2.xp?.level} ${r2.xp?.tier}`);

console.log("=== tampered item → COUNTERFEIT (no COA, no rank) ===");
const bad = { photoMatch: 62, nfcWave: 30, wifiReflection: 50, thermalHeat: 50, materialComposition: 35, hairlineDetail: 28, triCode: false, liveness: 80, biometric: 60, eventCorrelation: 40 };
const r3 = await post("/api/auth/mint", { userId: uid, title: "Suspect Jersey", sensors: bad, priceSources: sources });
console.log(`  VERDICT: ${r3.verdict.decision.toUpperCase()} · reason: ${r3.verdict.reason} · COA: ${r3.coa ? r3.coa.coaNumber : "BLOCKED"} · xp: ${r3.xp ? r3.xp.gained : "none"}`);
