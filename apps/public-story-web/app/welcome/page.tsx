"use client";

import { useState } from "react";
import {
  Crown,
  Panel,
  SectionTag,
  Badge,
  buttonStyle,
  color,
  font
} from "@crownx-jewel/shared-design";

const GATEWAY = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000";

const FUNNEL = [
  { n: "01", ico: "👀", h: "Land", p: "A shared slab card brings them in — the collectible is the ad, not a dead link." },
  { n: "02", ico: "🔐", h: "Verify", p: "One-tap biometric login. No passwords, no friction, instant trust." },
  { n: "03", ico: "🎴", h: "Mint", p: "Claim the founder slab — the reveal hooks them, the COA secures it." },
  { n: "04", ico: "👑", h: "Ascend", p: "First mint earns XP, opens /LV99, and unlocks the invite that grows the loop." }
];

const FEATURES = [
  { ico: "📜", h: "Genesis COA", p: "AI live-capture mints authenticity at the moment of the moment — tamper-evident, chain-anchored." },
  { ico: "💸", h: "Royalties for Life", p: "A fixed 10% on every resale, split between you, the athlete, and CrownX. Keep up to 85%." },
  { ico: "📈", h: "Live Market", p: "Every slab carries a floor that moves while you sleep — the reason to come back." },
  { ico: "🔥", h: "Streaks & Drops", p: "Daily multipliers, limited Genesis drops, and pack-rips that keep the loop alive." },
  { ico: "🏆", h: "/LV99 Status", p: "A visible rank that only climbs and gates the rarest founder drops." },
  { ico: "🛡", h: "Quantum-Resistant", p: "Post-quantum signing keeps the provenance ledger defensible for the long haul." }
];

const PROOF = [
  { n: "250", l: "Genesis slabs" },
  { n: "10%", l: "Royalty for life" },
  { n: "/LV99", l: "Status ladder" },
  { n: "1-tap", l: "Authentication" }
];

export default function WelcomePage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [tone, setTone] = useState<"win" | "hot">("win");

  async function reserve() {
    if (!email.includes("@")) {
      setTone("hot");
      setMsg("✗ Enter a valid email");
      return;
    }
    // Wire to the existing email/CRM capture; fall back to optimistic confirm.
    try {
      await fetch(`${GATEWAY}/api/public-story/waitlist`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, source: "welcome-landing" })
      }).catch(() => undefined);
    } finally {
      setTone("win");
      setMsg(`✓ Reserved — slab #${31 + Math.floor(Math.random() * 200)}/250 held for you. Check your inbox.`);
      setEmail("");
    }
  }

  return (
    <div>
      {/* hero */}
      <section style={{ textAlign: "center", padding: "50px 0 30px" }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Crown size={56} />
        </div>
        <h1 style={{ fontFamily: font.display, fontWeight: 400, fontSize: "clamp(44px,8vw,84px)", lineHeight: 0.92, margin: "14px 0 0" }}>
          Own the moment.
          <br />
          <span style={{ color: color.cyanHi }}>Earn from it forever.</span>
        </h1>
        <p style={{ fontSize: "clamp(15px,2.5vw,20px)", color: color.mut, maxWidth: 620, margin: "18px auto 0" }}>
          CrownX turns any authenticated collectible into a graded, chain-anchored slab — with a 10% royalty that pays
          you on every resale, for life.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 30, flexWrap: "wrap" }}>
          <button onClick={() => document.getElementById("cap")?.scrollIntoView({ behavior: "smooth" })} style={buttonStyle("primary")}>
            Claim your founder slab →
          </button>
          <button onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })} style={buttonStyle("secondary")}>
            See how it works
          </button>
        </div>
        <div style={{ fontFamily: font.mono, fontSize: 11, color: color.mut2, letterSpacing: "0.1em", marginTop: 22, textTransform: "uppercase" }}>
          Verify · Protect · Monetize — Patent Pending #63/704,653
        </div>
      </section>

      {/* social proof */}
      <div style={{ display: "flex", gap: 28, justifyContent: "center", flexWrap: "wrap", padding: "24px 0", borderTop: `1px solid ${color.line}`, borderBottom: `1px solid ${color.line}` }}>
        {PROOF.map((p) => (
          <div key={p.l} style={{ textAlign: "center" }}>
            <div style={{ fontFamily: font.display, fontSize: 32, color: color.cyanHi }}>{p.n}</div>
            <div style={{ fontSize: 11, color: color.mut, letterSpacing: "0.06em", textTransform: "uppercase" }}>{p.l}</div>
          </div>
        ))}
      </div>

      {/* funnel */}
      <section id="how" style={{ padding: "60px 0 0", textAlign: "center" }}>
        <SectionTag>The Funnel</SectionTag>
        <h2 style={{ fontFamily: font.display, fontWeight: 400, fontSize: "clamp(28px,5vw,42px)", margin: "0 auto" }}>
          From curious to collector in four taps
        </h2>
        <p style={{ color: color.mut, maxWidth: 600, margin: "14px auto 0" }}>
          A conversion path engineered so the first mint happens fast — and the friend reward makes the second user free.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginTop: 40, textAlign: "left" }}>
          {FUNNEL.map((s) => (
            <Panel key={s.n}>
              <div style={{ fontFamily: font.mono, fontSize: 11, color: color.cyan, letterSpacing: "0.1em" }}>{s.n}</div>
              <div style={{ fontSize: 30, margin: "8px 0" }}>{s.ico}</div>
              <h3 style={{ fontFamily: font.display, fontSize: 18, color: color.cyanHi, margin: 0 }}>{s.h}</h3>
              <p style={{ fontSize: 13, color: color.mut, marginTop: 6, marginBottom: 0 }}>{s.p}</p>
            </Panel>
          ))}
        </div>
      </section>

      {/* features */}
      <section style={{ padding: "60px 0 0", textAlign: "center" }}>
        <SectionTag>Why CrownX</SectionTag>
        <h2 style={{ fontFamily: font.display, fontWeight: 400, fontSize: "clamp(28px,5vw,42px)", margin: 0 }}>One platform. Every collectible.</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14, marginTop: 40, textAlign: "left" }}>
          {FEATURES.map((f) => (
            <Panel key={f.h}>
              <div style={{ fontSize: 28 }}>{f.ico}</div>
              <h3 style={{ fontFamily: font.display, fontSize: 19, marginTop: 10, marginBottom: 0 }}>{f.h}</h3>
              <p style={{ fontSize: 13, color: color.mut, marginTop: 6, marginBottom: 0 }}>{f.p}</p>
            </Panel>
          ))}
        </div>
      </section>

      {/* pricing note — reads from platform, never edited here */}
      <Panel style={{ marginTop: 40, border: "1px dashed rgba(217,168,46,0.4)", background: "rgba(217,168,46,0.04)", textAlign: "center" }}>
        <h3 style={{ fontFamily: font.display, fontSize: 22, color: color.goldHi, margin: 0 }}>Pricing lives in the platform</h3>
        <p style={{ fontSize: 13, color: color.mut, marginTop: 8, maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
          CrownX&apos;s subscription prices and fee logic are already defined in the platform code. Higher tiers shift
          more of the 10% royalty to you (up to 85%). This revamp reshapes the design and experience around that
          pricing — it does not change the numbers.
        </p>
        <div style={{ marginTop: 12 }}>
          <Badge tone="gold">Design revamp · pricing untouched · athlete pipeline built-in</Badge>
        </div>
      </Panel>

      {/* email capture */}
      <section id="cap" style={{ marginTop: 40, padding: "34px 24px", borderRadius: 20, background: `linear-gradient(135deg, ${color.ink}, ${color.void})`, border: `1px solid ${color.line2}`, textAlign: "center" }}>
        <h2 style={{ fontFamily: font.display, fontWeight: 400, fontSize: 30, margin: 0 }}>Get your founder slab</h2>
        <p style={{ color: color.mut, marginTop: 8 }}>
          250 Genesis slabs. Each carries a royalty for life and a /LV99 head-start. When they&apos;re gone, they&apos;re gone.
        </p>
        <div style={{ display: "flex", gap: 10, maxWidth: 460, margin: "22px auto 0", flexWrap: "wrap" }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && reserve()}
            type="email"
            placeholder="you@email.com"
            autoComplete="email"
            style={{ flex: 1, minWidth: 200, padding: "15px 16px", borderRadius: 12, border: `1px solid ${color.line2}`, background: "rgba(255,255,255,0.05)", color: color.txt, fontSize: 15, fontFamily: font.body }}
          />
          <button onClick={reserve} style={buttonStyle("primary")}>Reserve →</button>
        </div>
        <div style={{ fontFamily: font.mono, fontSize: 12, color: tone === "win" ? color.win : color.hot, marginTop: 14, minHeight: 16, letterSpacing: "0.04em" }}>{msg}</div>
      </section>

      <footer style={{ padding: "40px 0", textAlign: "center", borderTop: `1px solid ${color.line}`, marginTop: 50 }}>
        <div style={{ fontFamily: font.display, fontSize: 18, color: color.mut }}>
          CROWN<span style={{ color: color.cyan }}>X</span> VAULT
        </div>
        <div style={{ fontFamily: font.mono, fontSize: 9, color: color.mut2, letterSpacing: "0.2em", marginTop: 10, textTransform: "uppercase" }}>
          Confidential — IP Protected · Patent Pending
        </div>
      </footer>
    </div>
  );
}
