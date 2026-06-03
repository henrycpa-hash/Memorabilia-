"use client";

import { useEffect, useState } from "react";
import { SectionTag, Panel, color, font, gradient } from "@crownx-jewel/shared-design";

/**
 * The CrownX Vault — Protocol System landing page (ported from
 * `crownx-vault-v2.html`). Verify · Protect · Monetize. The royalties scenario
 * switcher is WIRED to the live royalty-vault-service (`/api/royalty-vault/scenarios`),
 * and the CTAs route into the real product surfaces (mint, claim, COA viewer).
 */

const GATEWAY = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000";
const VAULT_APP = process.env.NEXT_PUBLIC_VAULT_URL || "http://localhost:3003";
const CREATOR_APP = process.env.NEXT_PUBLIC_CREATOR_URL || "http://localhost:3001";

type Scenario = { id: string; label: string; when: string };

// canonical shares of the fixed 10% royalty (mirrors @crownx-jewel/shared-royalty
// at base/free tier) — orig / athlete / crownx, summing to 100% of the pool
const SPLITS: Record<string, { orig: number; athlete: number; crownx: number; donated?: boolean }> = {
  default: { orig: 60, athlete: 10, crownx: 30 },
  athlete_originated: { orig: 0, athlete: 70, crownx: 30 },
  live_authenticated: { orig: 20, athlete: 50, crownx: 30 },
  donation: { orig: 60, athlete: 10, crownx: 30, donated: true }
};

export default function VaultProtocolPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [active, setActive] = useState("default");

  useEffect(() => {
    fetch(`${GATEWAY}/api/royalty-vault/scenarios`)
      .then((r) => r.json())
      .then((d) => setScenarios(d.scenarios || []))
      .catch(() => setScenarios(Object.keys(SPLITS).map((id) => ({ id, label: id, when: "" }))));
  }, []);

  const split = SPLITS[active] || SPLITS.default;
  const activeScn = scenarios.find((s) => s.id === active);

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto" }}>
      {/* ── HERO ── */}
      <section style={{ textAlign: "center", padding: "30px 0 8px" }}>
        <div style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: "0.4em", textTransform: "uppercase", color: color.cyan, marginBottom: 14 }}>
          CrownX Protocol · Verify · Protect · Monetize
        </div>
        <h1 style={{ fontFamily: font.display, fontWeight: 400, lineHeight: 0.84, letterSpacing: "0.01em", fontSize: "clamp(58px,13vw,128px)", margin: 0, background: "linear-gradient(180deg,#fff,#bcc6da 50%,#5e6880)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
          CROWN<span style={{ background: `linear-gradient(180deg,${color.cyanHi},${color.cyan} 55%,${color.cyanDk})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>X</span> VAULT
        </h1>
        <div style={{ fontFamily: font.mono, fontSize: 11, letterSpacing: "0.22em", color: color.mut, textTransform: "uppercase", marginTop: 14 }}>From Memorabilia to Music — We&apos;ve Got You Covered</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 22, flexWrap: "wrap" }}>
          {[["VERIFY", true], ["PROTECT", true], ["MONETIZE", true], ["FOREVER SECURED", false]].map(([s, hl]) => (
            <span key={s as string} style={{ fontFamily: font.display, fontSize: 18, letterSpacing: "0.06em", color: hl ? color.cyanHi : color.txt, padding: "7px 16px", border: `1px solid ${color.line2}`, borderRadius: 8, background: "rgba(255,255,255,0.02)" }}>{s}</span>
          ))}
        </div>
      </section>

      {/* ── THE WHY ── */}
      <Section tag="The Why" title="A milestone with no chain of custody gets stolen">
        <p style={lead}>
          When a fan catches a milestone — a record ball, a worn jersey, a one-of-one — the value is real but the proof isn&apos;t.
          Disputed ownership, pressured hand-offs, no provenance. CrownX establishes authenticity <em>at the moment of the moment</em>:
          AI + Live Capture mints a Genesis COA before the object ever leaves the fan&apos;s hands.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", border: `1px solid rgba(63,217,212,0.25)`, borderRadius: 14, background: "rgba(63,217,212,0.04)", marginTop: 16 }}>
          <div style={{ width: 48, height: 48, flex: "none", borderRadius: "50%", border: `2px dashed ${color.cyan}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.mono, fontSize: 7, textAlign: "center", letterSpacing: "0.06em", color: color.cyan, textTransform: "uppercase" }}>Patent Pending</div>
          <div>
            <div style={{ fontFamily: font.display, fontSize: 16, letterSpacing: "0.02em" }}>AI-ENHANCED PROVENANCE, DECENTRALIZED AUTHENTICITY &amp; ROYALTIES</div>
            <div style={{ fontFamily: font.mono, fontSize: 9, color: color.mut, letterSpacing: "0.04em", marginTop: 3 }}>PROVISIONAL · UTILITY · FILED 10/2024 · No. 63/704,633</div>
          </div>
        </div>
      </Section>

      {/* ── THE LIVING SLAB ── */}
      <Section tag="The Surface" title="The Living Slab">
        <p style={lead}>Every authenticated asset becomes a graded, chain-anchored slab — holo crest, signature grade, embedded capture, scannable Genesis COA. It rotates in its case like a physical graded collectible.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 40, alignItems: "center", justifyContent: "center", marginTop: 24 }}>
          <Slab />
          <div style={{ flex: 1, minWidth: 260, maxWidth: 420 }}>
            <a href={`${VAULT_APP}/mint`} style={{ ...mintBtn, textDecoration: "none", display: "block", textAlign: "center" }}>▶ MINT &amp; CAPTURE GENESIS COA</a>
            <div style={{ fontFamily: font.mono, fontSize: 9.5, letterSpacing: "0.14em", color: color.mut, marginTop: 10, textTransform: "uppercase", textAlign: "center" }}>Live capture → authenticate → Genesis COA, in one tap</div>
            <a href={`${VAULT_APP}/coa`} style={{ ...ghostBtn, textDecoration: "none", display: "block", textAlign: "center", marginTop: 10 }}>View a live COA in 3D / AR/VR →</a>
          </div>
        </div>
      </Section>

      {/* ── GENESIS COA PIPELINE ── */}
      <Section tag="The Protocol" title="Capture → Genesis COA">
        <p style={lead}>The patented pipeline that fires the instant an asset is captured. Authenticity is born live, hashed, anchored, and royalty-enabled.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginTop: 16 }}>
          {[["🎥", "01", "AI Live Capture", "Multi-sensor scan at the moment."], ["🔎", "02", "Authenticate", "Fingerprint hash · three-code."], ["📜", "03", "Genesis COA", "Interactive cert is minted."], ["⛓", "04", "Anchor", "Provenance ledger entry."], ["🛡", "05", "Secure", "Quantum-resistant signing."], ["💸", "06", "Royalty-Enabled", "Smart contract goes live."]].map(([ico, n, name, d]) => (
            <div key={n} style={{ padding: 14, border: `1px solid ${color.line}`, borderRadius: 12, background: "linear-gradient(165deg,rgba(255,255,255,0.03),transparent)", textAlign: "center" }}>
              <div style={{ width: 34, height: 34, margin: "0 auto 8px", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, background: "linear-gradient(135deg,rgba(63,217,212,0.2),rgba(63,217,212,0.05))", border: `1px solid rgba(63,217,212,0.3)` }}>{ico}</div>
              <div style={{ fontFamily: font.mono, fontSize: 8, letterSpacing: "0.1em", color: color.cyan, textTransform: "uppercase" }}>{n}</div>
              <div style={{ fontFamily: font.display, fontSize: 15, marginTop: 2 }}>{name}</div>
              <div style={{ fontSize: 10, color: color.mut, marginTop: 3 }}>{d}</div>
            </div>
          ))}
        </div>
        <DiligenceNote>&quot;Quantum security&quot; reads as <b style={{ color: color.gold }}>post-quantum / quantum-resistant cryptographic signing</b> — defending the ledger against future quantum attacks. We keep the language to &quot;quantum-resistant cryptography,&quot; not &quot;quantum computing,&quot; so the moat survives diligence.</DiligenceNote>
      </Section>

      {/* ── ROYALTIES FOR LIFE (live scenario switcher) ── */}
      <Section tag="The Economic Engine" title="Royalties For Life">
        <p style={lead}>A 10% royalty pays out on every resale, forever. The 10% stays fixed — what changes is how it splits, based on who originated the piece and how it was authenticated. Pick a scenario.</p>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 16 }}>
          {(scenarios.length ? scenarios : Object.keys(SPLITS).map((id) => ({ id, label: id, when: "" }))).map((s) => (
            <button key={s.id} onClick={() => setActive(s.id)} style={{ ...tab, ...(active === s.id ? tabOn : {}) }}>{s.label.replace(/\s*\(.*\)/, "")}</button>
          ))}
        </div>
        <Panel glow style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, color: color.mut, marginBottom: 14 }}>{activeScn?.when || "Live split routed automatically at every resale hop."}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <SplitBar label="Originator (fan)" pct={split.orig} c={color.cyanHi} />
            <SplitBar label={split.donated ? "Athlete → donated (tax-tracked)" : "Athlete"} pct={split.athlete} c={color.goldHi} />
            <SplitBar label="CrownX (protocol floor)" pct={split.crownx} c={color.plat} />
          </div>
          <div style={{ fontFamily: font.mono, fontSize: 9, color: color.mut2, letterSpacing: "0.06em", marginTop: 14, textAlign: "center" }}>SHARE OF THE 10% ROYALTY · SALE-PRICE ECONOMICS UNCHANGED ACROSS SCENARIOS</div>
        </Panel>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, border: `1px dashed rgba(217,168,46,0.4)`, borderRadius: 14, background: "rgba(217,168,46,0.05)", marginTop: 12 }}>
          <div style={{ fontSize: 28 }}>🔑</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: font.display, fontSize: 18, letterSpacing: "0.04em", color: color.goldHi }}>THE ROYALTY VAULT</div>
            <div style={{ fontSize: 10.5, color: color.mut }}>Routes each split automatically, on-chain, at every hop. The athlete&apos;s slice is <b style={{ color: color.txt }}>held in treasury until claimed</b> — or tracked as a charitable write-off if left as a donation.</div>
          </div>
          <a href={`${CREATOR_APP}/athlete`} style={{ ...ghostBtn, textDecoration: "none", flex: "none" }}>Claim royalties →</a>
        </div>
      </Section>

      {/* ── TIERED PRICING ── */}
      <Section tag="Subscriptions" title="Pay More, Keep More — Both Sides">
        <p style={lead}>Fans and athletes can each subscribe to improve their own cut. Fan tiers shift CrownX&apos;s share to the fan on fan-originated pieces; athlete tiers raise the athlete&apos;s share. (Display only — live prices live in the platform code.)</p>
        <TierRow label="Fan / Originator tiers" accent={color.cyan} tiers={[["FREE", "$0", "60%", "Base share · all mechanics"], ["COLLECTOR+", "$$", "75%", "+15% from CrownX · lower fees"], ["SOVEREIGN", "$$$", "85%", "Max share · founder drops"]]} />
        <TierRow label="Athlete tiers" accent={color.gold} tiers={[["FREE", "$0", "70%", "Athlete-originated base"], ["PRO", "$$", "80%", "Faster payouts · verify priority"], ["ELITE", "$$$", "90%", "Max share · marketing control"]]} />
        <DiligenceNote>Dollar amounts are placeholders ($$ / $$$) — actual monthly prices live in the platform code. CrownX always retains a protocol floor. The athlete separately controls a tax-donation election (their slice only), toggleable until first resale, then locked. Not tax advice.</DiligenceNote>
      </Section>

      {/* ── MINT MOMENT ── */}
      <Section tag="Mechanic 01 — The Trigger" title="The Mint Moment">
        <p style={lead}>A 3-second spike: case assembles, COA charges, rarity rolls, slab snaps to a grade. The reveal is the screenshot people post before they&apos;re asked.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginTop: 16 }}>
          {[["0.0s", "Charge", "Case forms, COA seam ignites."], ["1.2s", "Roll", "Rarity tumbles — disclosed odds."], ["2.4s", "Snap", "Grade locks, burst, haptic."], ["2.8s", "Broadcast", "Share card + market entry."]].map(([t, n, d]) => (
            <div key={t} style={{ padding: 14, border: `1px solid ${color.line}`, borderRadius: 12, background: "linear-gradient(165deg,rgba(255,255,255,0.03),transparent)" }}>
              <div style={{ fontFamily: font.mono, fontSize: 8, color: color.mut2, letterSpacing: "0.1em" }}>{t}</div>
              <div style={{ fontFamily: font.display, fontSize: 16, color: color.cyanHi, marginTop: 2 }}>{n}</div>
              <div style={{ fontSize: 11, color: color.mut, marginTop: 4 }}>{d}</div>
            </div>
          ))}
        </div>
        <DiligenceNote>Variable-rarity rolls read as gambling-adjacent to regulators. Keep odds on-screen, never hide probabilities behind a paid roll, don&apos;t target minors — the thrill survives diligence.</DiligenceNote>
      </Section>

      <footer style={{ padding: "46px 0", textAlign: "center" }}>
        <div style={{ fontFamily: font.display, fontSize: 22, letterSpacing: "0.1em", color: color.mut }}>CROWN<span style={{ color: color.cyan }}>X</span> VAULT</div>
        <div style={{ fontFamily: font.mono, fontSize: 9, color: color.mut2, letterSpacing: "0.1em", marginTop: 6 }}>Verify · Protect · Monetize · Forever Secured</div>
      </footer>
    </div>
  );
}

/* ───────────────── presentational bits ───────────────── */
const lead: React.CSSProperties = { color: color.mut, fontSize: 14, fontWeight: 300, maxWidth: 640, marginTop: 6 };
const tab: React.CSSProperties = { fontFamily: font.mono, fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", padding: "9px 14px", borderRadius: 999, border: `1px solid ${color.line2}`, background: "transparent", color: color.mut, cursor: "pointer" };
const tabOn: React.CSSProperties = { background: gradient.cyan, color: color.void, borderColor: "transparent", fontWeight: 600 };
const mintBtn: React.CSSProperties = { padding: 17, border: "none", borderRadius: 14, fontFamily: font.display, fontSize: 21, letterSpacing: "0.04em", color: color.void, cursor: "pointer", background: `linear-gradient(100deg,${color.cyanHi},${color.cyan} 55%,${color.cyanDk})`, boxShadow: "0 10px 30px -8px rgba(63,217,212,0.5)" };
const ghostBtn: React.CSSProperties = { fontFamily: font.mono, fontSize: 11, letterSpacing: "0.06em", color: color.cyanHi, background: "transparent", border: `1px solid ${color.line2}`, borderRadius: 11, padding: "11px 14px", cursor: "pointer" };

function Section({ tag, title, children }: { tag: string; title: string; children: React.ReactNode }) {
  return (
    <section style={{ padding: "44px 0 4px", borderTop: `1px solid ${color.line}`, marginTop: 30 }}>
      <SectionTag>{tag}</SectionTag>
      <h2 style={{ fontFamily: font.display, fontWeight: 400, letterSpacing: "0.01em", lineHeight: 0.96, fontSize: 44, margin: "8px 0 4px" }}>{title}</h2>
      {children}
    </section>
  );
}
function SplitBar({ label, pct, c }: { label: string; pct: number; c: string }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: font.mono, fontSize: 10.5, color: color.mut, marginBottom: 4 }}>
        <span>{label}</span><span style={{ color: c }}>{pct}%</span>
      </div>
      <div style={{ height: 10, borderRadius: 6, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 6, background: c, transition: "width .4s ease", opacity: 0.85 }} />
      </div>
    </div>
  );
}
function TierRow({ label, accent, tiers }: { label: string; accent: string; tiers: string[][] }) {
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontFamily: font.mono, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: accent }}>{label}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10, marginTop: 8 }}>
        {tiers.map(([n, price, share, d]) => (
          <Panel key={n}>
            <div style={{ fontFamily: font.display, fontSize: 18 }}>{n}</div>
            <div style={{ fontFamily: font.display, fontSize: 28, color: color.cyanHi, marginTop: 2 }}>{price}<span style={{ fontSize: 12, color: color.mut }}>/mo</span></div>
            <div style={{ fontFamily: font.display, fontSize: 24, color: color.goldHi, marginTop: 6 }}>{share}</div>
            <div style={{ fontSize: 10.5, color: color.mut, marginTop: 6 }}>{d}</div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
function DiligenceNote({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 14, padding: "13px 14px", borderRadius: 12, border: `1px solid rgba(255,77,109,0.25)`, background: "rgba(255,77,109,0.05)" }}>
      <div style={{ fontFamily: font.mono, fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: color.hot, marginBottom: 5 }}>⚠ Diligence note</div>
      <p style={{ fontSize: 11.5, color: "#d6b6bd", fontWeight: 300, margin: 0 }}>{children}</p>
    </div>
  );
}
/** A CSS-3D rotating graded slab (the "living slab"). */
function Slab() {
  return (
    <div style={{ perspective: 1500, width: 248, height: 400, flex: "none" }}>
      <div style={{ position: "relative", width: "100%", height: "100%", transformStyle: "preserve-3d", animation: "cx-slabspin 16s cubic-bezier(.45,.05,.55,.95) infinite" }}>
        <div className="cx-sheen" style={{ position: "absolute", inset: 0, borderRadius: 16, overflow: "hidden", background: "linear-gradient(155deg,#10131d,#06080f 60%)", border: `1px solid ${color.line2}`, boxShadow: "0 40px 80px -20px rgba(0,0,0,0.9)", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", gap: 8, padding: "9px 10px", background: "linear-gradient(180deg,#fafbff,#e7e9f0)", color: "#10131f" }}>
            <div style={{ width: 42, height: 42, borderRadius: 8, flex: "none", background: gradient.holo, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.display, fontSize: 20, color: "#10131f" }}>CX</div>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ fontFamily: font.display, fontSize: 16, lineHeight: 1 }}>A. VANGUARD</div>
              <div style={{ fontFamily: font.mono, fontSize: 8, background: "#10131f", color: "#fff", padding: "2px 5px", borderRadius: 3, width: "fit-content", marginTop: 3 }}>MAN OF THE ARENA</div>
            </div>
            <div style={{ textAlign: "center", borderLeft: "1px solid rgba(0,0,0,0.12)", paddingLeft: 9, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ fontFamily: font.display, fontSize: 30, lineHeight: 0.8, background: gradient.holo, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>10</div>
              <div style={{ fontFamily: font.mono, fontSize: 7, color: "#10131f" }}>MINT · 1/1</div>
            </div>
          </div>
          <div style={{ background: "linear-gradient(100deg,#0a2c34,#05100f)", padding: "7px 10px", borderTop: `2px solid ${color.cyan}` }}>
            <div style={{ fontFamily: font.display, fontSize: 24, textAlign: "center", background: `linear-gradient(180deg,${color.cyanHi},${color.cyan} 55%,#1c6f6b)`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>SEASON I &amp; III</div>
            <div style={{ fontFamily: font.mono, fontSize: 6.5, letterSpacing: "0.08em", color: "#a9d9d6", textAlign: "center" }}>CROWNX ARENA · GENESIS COA</div>
          </div>
          <div style={{ flex: 1, background: "radial-gradient(circle at 50% 30%,rgba(63,217,212,0.12),transparent 60%),linear-gradient(180deg,#0a0d13,#04060d)", display: "flex", alignItems: "flex-end", justifyContent: "center", position: "relative" }}>
            <span style={{ position: "absolute", top: 8, right: 8, fontFamily: font.mono, fontSize: 7, color: color.cyan, border: "1px solid rgba(63,217,212,0.4)", padding: "2px 5px", borderRadius: 3 }}>HOLO ◆ FOIL</span>
            <span style={{ fontFamily: font.display, fontSize: 40, color: "rgba(255,255,255,0.14)", marginBottom: 10 }}>27</span>
          </div>
          <div style={{ background: "linear-gradient(180deg,#080b11,#05070e)", padding: "8px 12px 11px", borderTop: `1px solid rgba(63,217,212,0.3)`, display: "flex", justifyContent: "space-between" }}>
            {[["176", "TK"], ["18", "PASS DF"], ["7", "INT"]].map(([v, k]) => (
              <div key={k} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: font.display, fontSize: 20, color: color.cyanHi, lineHeight: 0.9 }}>{v}</div>
                <div style={{ fontFamily: font.mono, fontSize: 6.5, letterSpacing: "0.1em", color: color.mut }}>{k}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
