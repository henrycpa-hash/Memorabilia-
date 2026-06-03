"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SectionTag, Panel, Badge, ButtonLink, buttonStyle, color, font } from "@crownx-jewel/shared-design";

const GATEWAY = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000";

function sub(): string {
  if (typeof document === "undefined") return "guest";
  const m = document.cookie.match(/cx_access=([^;]+)/);
  try {
    return m ? (JSON.parse(atob(m[1].split(".")[1])).sub as string) : "guest";
  } catch {
    return "guest";
  }
}
const rnd = (lo: number, hi: number) => Math.round(lo + Math.random() * (hi - lo));

type Contribution = { modality: string; label: string; weight: number; score: number; contribution: number };
type MintResult = {
  stage: string;
  fusion: { confidence: number; anomalyScore: number; triCode: boolean; contributions: Contribution[] };
  verdict: { decision: string; reason: string };
  fingerprint?: { fingerprintHash: string; tokenId: string; anchorTx: string };
  provenance?: { coaNumber: string; l2TxHash: string; l1AnchorBlock: string };
  price: { valueDisplay: string; confidence: number };
  coa: { coaNumber: string } | null;
  coaArtifact?: { id: string; tokenId: string; viewUrl: string; immersive: boolean } | null;
  xp: { gained: number; level: number; tier: string; leveledUp: boolean } | null;
};
type Source = { id: string; name: string; url: string; role: string };

export default function MintPage() {
  const [title, setTitle] = useState("Game-Worn Finals Jersey");
  const [tamper, setTamper] = useState(false);
  const [phase, setPhase] = useState<"idle" | "capturing" | "done">("idle");
  const [result, setResult] = useState<MintResult | null>(null);
  const [sources, setSources] = useState<Source[]>([]);

  useEffect(() => {
    fetch(`${GATEWAY}/api/auth/training-sources`).then((r) => r.json()).then((d) => setSources(d.sources || [])).catch(() => undefined);
  }, []);

  async function capture() {
    setPhase("capturing");
    setResult(null);
    if (navigator.vibrate) navigator.vibrate(20);
    // live-capture multi-sensor readings (authentic = high; tamper = forensic mismatch)
    const sensors = tamper
      ? { photoMatch: rnd(55, 70), nfcWave: rnd(20, 45), wifiReflection: rnd(40, 60), thermalHeat: rnd(40, 60), materialComposition: rnd(25, 45), hairlineDetail: rnd(20, 40), triCode: Math.random() > 0.5, liveness: rnd(70, 90), biometric: rnd(50, 70), eventCorrelation: rnd(30, 55) }
      : { photoMatch: rnd(88, 99), nfcWave: rnd(90, 99), wifiReflection: rnd(80, 95), thermalHeat: rnd(82, 96), materialComposition: rnd(88, 99), hairlineDetail: rnd(90, 99), triCode: true, liveness: rnd(90, 99), biometric: rnd(88, 98), eventCorrelation: rnd(85, 98) };
    const priceSources = { psaSignatureGrade: tamper ? 4 : 9, beckettGuideCents: 3_800_00, jsaVerified: !tamper, worthpointMedianCents: 4_200_00, ebaySoldCompsCents: [3_900_00, 4_400_00, 4_100_00, 5_200_00], rarity: 78 };
    await new Promise((r) => setTimeout(r, 1300)); // live capture window
    try {
      const res = await fetch(`${GATEWAY}/api/auth/mint`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: sub(), title, assetType: "memorabilia", sensors, priceSources })
      });
      const d = await res.json();
      setResult(d);
      setPhase("done");
      if (navigator.vibrate) navigator.vibrate(d.coa ? [12, 30, 60] : 30);
    } catch {
      setPhase("idle");
    }
  }

  const v = result?.verdict.decision;
  const tone = v === "genesis" ? "win" : v === "verified" ? "cyan" : "hot";

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <SectionTag>CrownX Live Authentication · Mint</SectionTag>
      <h1 style={{ fontFamily: font.display, fontWeight: 400, fontSize: 44, margin: "0 0 4px" }}>Authenticate live. Mint. Climb.</h1>
      <p style={{ color: color.mut, maxWidth: 640, marginTop: 0 }}>
        Live capture runs the multi-sensor authentication engine — AI photo-matching, NFC/RF waves, Wi-Fi reflection,
        thermal, material composition, down to <b style={{ color: color.cyanHi }}>fractional hairline detail</b> — issues a
        Genesis COA on-chain, and your authenticated mint <b style={{ color: color.goldHi }}>climbs your /LV99 rank</b>.
      </p>

      {/* live capture */}
      <Panel glow style={{ marginTop: 16 }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <div
            style={{ width: 150, height: 150, borderRadius: 16, flex: "none", position: "relative", overflow: "hidden", border: `1px solid ${color.line2}`, background: "radial-gradient(circle at 50% 40%, rgba(63,217,212,0.18), rgba(4,6,13,0.9))", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {phase === "capturing" && <span style={{ position: "absolute", left: 8, right: 8, height: 2, background: `linear-gradient(90deg, transparent, ${color.cyanHi}, transparent)`, animation: "cx-scan 1.1s ease-in-out infinite" }} />}
            <span style={{ fontSize: 52 }}>{phase === "capturing" ? "📡" : result?.coa ? "👑" : v === "counterfeit" ? "🚫" : "🎥"}</span>
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Item title" style={{ width: "100%", background: "rgba(255,255,255,0.05)", color: color.txt, border: `1px solid ${color.line2}`, padding: "11px 13px", borderRadius: 11, fontSize: 14, fontFamily: font.body }} />
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontFamily: font.mono, fontSize: 11, color: color.mut, cursor: "pointer" }}>
              <input type="checkbox" checked={tamper} onChange={(e) => setTamper(e.target.checked)} /> simulate a tampered item (counterfeit path)
            </label>
            <button onClick={capture} disabled={phase === "capturing"} style={{ ...buttonStyle("primary"), width: "100%", marginTop: 12 }}>
              {phase === "capturing" ? "📡 Capturing & authenticating…" : "🎥 Live capture → authenticate → mint"}
            </button>
          </div>
        </div>
      </Panel>

      {/* result */}
      {result && (
        <>
          <Panel style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <SectionTag>Multi-sensor fusion</SectionTag>
              <div style={{ display: "flex", gap: 8 }}>
                <Badge tone={tone}>{v?.toUpperCase()}</Badge>
                <Badge tone="cyan">{result.fusion.confidence}% confidence</Badge>
                <Badge tone={result.fusion.anomalyScore > 0.5 ? "hot" : "mut"}>anomaly {result.fusion.anomalyScore}</Badge>
              </div>
            </div>
            <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
              {result.fusion.contributions.map((c) => (
                <div key={c.modality}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                    <span style={{ color: color.txt }}>{c.label} <span style={{ color: color.mut2, fontFamily: font.mono, fontSize: 9 }}>· w{c.weight}</span></span>
                    <span style={{ fontFamily: font.mono, color: c.score >= 70 ? color.win : c.score >= 50 ? color.gold : color.hot }}>{c.score}</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                    <span style={{ display: "block", height: "100%", width: `${c.score}%`, background: c.score >= 70 ? `linear-gradient(90deg,${color.cyanDk},${color.cyanHi})` : c.score >= 50 ? `linear-gradient(90deg,${color.goldDeep},${color.goldHi})` : color.hot }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <Badge tone={result.fusion.triCode ? "win" : "hot"}>Tri-code {result.fusion.triCode ? "PASS" : "FAIL"}</Badge>
              <span style={{ fontFamily: font.mono, fontSize: 11, color: color.mut }}>{result.verdict.reason}</span>
            </div>
          </Panel>

          {result.coa ? (
            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", marginTop: 16 }}>
              <Panel glow>
                <SectionTag>Genesis COA issued · on-chain</SectionTag>
                <div style={{ fontFamily: font.display, fontSize: 30, color: color.cyanHi }}>{result.coa.coaNumber}</div>
                <div style={{ fontFamily: font.mono, fontSize: 10, color: color.mut2, marginTop: 6, wordBreak: "break-all" }}>
                  fingerprint {result.fingerprint?.fingerprintHash.slice(0, 28)}…<br />
                  token {result.fingerprint?.tokenId}<br />
                  L2 {result.provenance?.l2TxHash.slice(0, 18)}… · block {result.provenance?.l1AnchorBlock}
                </div>
                <div style={{ marginTop: 10 }}>
                  <Badge tone="gold">Weighted value {result.price.valueDisplay}</Badge>
                  <span style={{ fontFamily: font.mono, fontSize: 9, color: color.mut, marginLeft: 8 }}>· {result.price.confidence}% data confidence</span>
                </div>
                {result.coaArtifact && (
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${color.line}` }}>
                    <div style={{ fontFamily: font.mono, fontSize: 9, color: color.mut, textTransform: "uppercase", marginBottom: 6 }}>Genesis COA Artifact · 3D/4D + AR/VR</div>
                    <ButtonLink href={result.coaArtifact.viewUrl} as={Link} variant="primary">View COA in 3D/AR →</ButtonLink>
                    <span style={{ fontFamily: font.mono, fontSize: 9, color: color.mut2, marginLeft: 8 }}>dual-pane · unlockables · Meta Quest / AR glasses</span>
                  </div>
                )}
              </Panel>
              <Panel>
                <SectionTag>Rank climb</SectionTag>
                {result.xp ? (
                  <>
                    <div style={{ fontFamily: font.display, fontSize: 44, color: color.goldHi, lineHeight: 1 }}>+{result.xp.gained} <span style={{ fontSize: 16, color: color.mut }}>VXP</span></div>
                    <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <Badge tone="cyan">LV{result.xp.level} {result.xp.tier}</Badge>
                      {result.xp.leveledUp && <Badge tone="win">LEVELED UP ✨</Badge>}
                    </div>
                    <p style={{ color: color.mut, fontSize: 12, marginTop: 12 }}>Your authenticated mint moved your /LV99 rank. Keep authenticating to unlock the rarest drops.</p>
                    <ButtonLink href="/status" as={Link} variant="secondary" style={{ marginTop: 6 }}>View /LV99 →</ButtonLink>
                  </>
                ) : (
                  <p style={{ color: color.mut, fontSize: 13 }}>Sign in to earn XP on your authenticated mint.</p>
                )}
              </Panel>
            </div>
          ) : (
            <Panel style={{ marginTop: 16, border: "1px solid rgba(255,77,109,0.4)", background: "rgba(255,77,109,0.05)" }}>
              <SectionTag>Counterfeit — COA blocked</SectionTag>
              <p style={{ color: color.mut, fontSize: 13, margin: 0 }}>The engine flagged a forensic mismatch ({result.verdict.reason}). No COA issued; the record is sealed for audit. No rank credit.</p>
            </Panel>
          )}
        </>
      )}

      {/* reference data sources */}
      {sources.length > 0 && (
        <Panel style={{ marginTop: 16 }}>
          <SectionTag>AI reference data sources</SectionTag>
          <p style={{ color: color.mut, fontSize: 12, margin: "0 0 12px" }}>The engine trains photo-matching and computes the weighted dynamic value from these authorities.</p>
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))" }}>
            {sources.map((s) => (
              <a key={s.id} href={s.url} target="_blank" rel="noreferrer" style={{ textDecoration: "none", padding: "10px 12px", border: `1px solid ${color.line}`, borderRadius: 10, background: "rgba(255,255,255,0.02)", display: "block" }}>
                <div style={{ fontSize: 13, color: color.cyanHi }}>{s.name}</div>
                <div style={{ fontSize: 11, color: color.mut, marginTop: 3 }}>{s.role}</div>
              </a>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
