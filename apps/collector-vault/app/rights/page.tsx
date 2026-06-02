"use client";

import { useMemo, useState } from "react";
import {
  quoteStreamSale,
  SAMPLE_RIGHTS_MARKET,
  SUBSCRIPTION_LAPSE_RULE,
  formatUsdCents,
  type StreamSaleMode
} from "@crownx-jewel/shared-pricing";
import { SectionTag, Panel, Badge, buttonStyle, color, font } from "@crownx-jewel/shared-design";

/**
 * /rights — "Own the stream." Sell your lifetime royalty for cash now, or buy
 * someone else's. Everything computes from @crownx-jewel/shared-pricing/rights.
 */
export default function RightsPage() {
  const [floor, setFloor] = useState(100000); // $ floor
  const [sharePct, setSharePct] = useState(60); // % of the 10%
  const [vel, setVel] = useState(8); // 0.1× steps → 0.8/yr
  const [appr, setAppr] = useState(15); // %
  const [mode, setMode] = useState<StreamSaleMode>("lump");

  const quote = useMemo(
    () =>
      quoteStreamSale({
        floorCents: floor * 100,
        shareBps: sharePct * 100,
        resaleVelocityPerYear: vel / 10,
        annualAppreciation: appr / 100,
        mode
      }),
    [floor, sharePct, vel, appr, mode]
  );

  const labelStyle: React.CSSProperties = { fontFamily: font.mono, fontSize: 11, color: color.mut, display: "flex", justifyContent: "space-between", marginBottom: 6 };
  const range: React.CSSProperties = { width: "100%", accentColor: color.cyan };

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <section style={{ textAlign: "center", padding: "12px 0 8px" }}>
        <SectionTag>Royalty Rights</SectionTag>
        <h1 style={{ fontFamily: font.display, fontWeight: 400, fontSize: "clamp(34px,6vw,54px)", margin: "0 0 6px" }}>
          Own the <span style={{ color: color.cyanHi }}>stream.</span>
        </h1>
        <p style={{ color: color.mut, maxWidth: 560, margin: "0 auto" }}>
          Sell your lifetime royalty for cash now, or buy someone else&apos;s. The price is the discounted value of every future payout.
        </p>
      </section>

      {/* buyout calculator */}
      <SectionTag>Your buyout quote</SectionTag>
      <Panel glow>
        <Slider label="Current floor price" value={`$${floor.toLocaleString()}`} min={10000} max={500000} step={10000} v={floor} set={setFloor} ls={labelStyle} rs={range} />
        <Slider label="Your royalty share (of the 10%)" value={`${sharePct}%`} min={20} max={90} step={5} v={sharePct} set={setSharePct} ls={labelStyle} rs={range} />
        <Slider label="Resale velocity (per year)" value={`${(vel / 10).toFixed(1)}×`} min={1} max={20} step={1} v={vel} set={setVel} ls={labelStyle} rs={range} />
        <Slider label="Annual appreciation" value={`${appr}%`} min={0} max={40} step={1} v={appr} set={setAppr} ls={labelStyle} rs={range} />

        <div style={{ textAlign: "center", margin: "18px 0 8px" }}>
          <div style={{ fontFamily: font.mono, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: color.gold }}>Lump-sum buyout (FMV) — paid now</div>
          <div style={{ fontFamily: font.display, fontSize: 50, color: color.goldHi, lineHeight: 1, marginTop: 4 }}>{quote.display.fmv}</div>
          <div style={{ fontSize: 11, color: color.mut, marginTop: 6 }}>discounted present value of your future royalty stream</div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <Compare k="Cash now" v={quote.display.fmv} tone={color.cyanHi} />
          <Compare k="If you hold (10y nominal)" v={quote.display.nominalHold} tone={color.goldHi} />
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <Mode k="Lump sum" d="Full FMV now · clean exit" sel={mode === "lump"} on={() => setMode("lump")} />
          <Mode k="Short-term" d="Keep all but CrownX's 5%" sel={mode === "short_term"} on={() => setMode("short_term")} />
        </div>
        <p style={{ fontFamily: font.mono, fontSize: 10, color: color.mut2, lineHeight: 1.6, marginTop: 12 }}>
          {mode === "lump" ? (
            <><b style={{ color: color.gold }}>Lump sum:</b> a buyer pays you FMV today and inherits the stream; CrownX keeps a {quote.crownxFloorBps / 100}% floor of every future payout.</>
          ) : (
            <><b style={{ color: color.gold }}>Short-term:</b> keep collecting your full royalty (less CrownX&apos;s {quote.crownxFloorBps / 100}%) over a short payout window, then the rights transfer. Higher total, slower.</>
          )}
        </p>
      </Panel>

      {/* subscription vs buyout */}
      <div style={{ marginTop: 20 }}>
        <SectionTag>Or just subscribe</SectionTag>
        <Panel>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 13 }}>+5% share unlocked by your sub</span>
            <span style={{ fontFamily: font.display, fontSize: 24, color: color.goldHi }}>{quote.display.subscriptionExtra}</span>
          </div>
          <div style={{ fontSize: 11, color: color.mut, marginTop: 4 }}>DPV of the extra 5% — keep paying monthly and it&apos;s yours each resale.</div>
          <div style={{ display: "flex", gap: 11, padding: 13, border: `1px solid rgba(255,77,109,0.3)`, borderRadius: 12, background: "rgba(255,77,109,0.05)", marginTop: 12 }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <div style={{ fontSize: 11.5, color: "#d6b6bd" }}><b style={{ color: color.hot }}>Lapse rule:</b> {SUBSCRIPTION_LAPSE_RULE}</div>
          </div>
        </Panel>
      </div>

      {/* rights market */}
      <div style={{ marginTop: 20 }}>
        <SectionTag>Royalty-rights market</SectionTag>
        <p style={{ color: color.mut, fontSize: 12, margin: "0 0 12px" }}>Buy other people&apos;s royalty streams — per item, or as diversified pools. Yield shown is FMV-implied.</p>
        <div style={{ display: "grid", gap: 9 }}>
          {SAMPLE_RIGHTS_MARKET.map((l) => (
            <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: 13, border: `1px solid ${color.line}`, borderRadius: 13, background: "rgba(255,255,255,0.02)" }}>
              <div style={{ width: 40, height: 40, borderRadius: 9, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, background: `linear-gradient(135deg, ${color.cyanDk}, #0a2c34)` }}>{l.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{l.name}</div>
                <div style={{ fontFamily: font.mono, fontSize: 9, color: color.mut, letterSpacing: "0.04em", marginTop: 2 }}>{l.meta}</div>
                {l.pooled && <div style={{ marginTop: 4 }}><Badge tone="gold">Pooled · diversified</Badge></div>}
              </div>
              <div style={{ textAlign: "right", flex: "none" }}>
                <div style={{ fontFamily: font.display, fontSize: 17, color: color.goldHi }}>{formatUsdCents(l.priceCents)}</div>
                <div style={{ fontFamily: font.mono, fontSize: 9, color: color.win, marginTop: 1 }}>~{l.impliedYieldPct}% implied</div>
                <button style={{ ...buttonStyle("primary"), marginTop: 6, padding: "6px 12px", fontSize: 11 }} onClick={(e) => { (e.currentTarget as HTMLButtonElement).textContent = "✓ Offer sent"; }}>Buy rights</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p style={{ fontFamily: font.mono, fontSize: 10, color: color.mut2, lineHeight: 1.7, marginTop: 16, textAlign: "center" }}>
        <b style={{ color: color.gold }}>Buyout eligibility:</b> a fan can sell an asset&apos;s full royalty only if they are the sole originator (no athlete on the upload).
        Athlete-involved assets route through the athlete claim funnel. Not investment advice — DPV is an estimate, not a guarantee.
      </p>
    </div>
  );
}

function Slider({ label, value, min, max, step, v, set, ls, rs }: { label: string; value: string; min: number; max: number; step: number; v: number; set: (n: number) => void; ls: React.CSSProperties; rs: React.CSSProperties }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={ls}><span>{label}</span><span style={{ color: color.cyanHi, fontWeight: 600 }}>{value}</span></div>
      <input type="range" min={min} max={max} step={step} value={v} onChange={(e) => set(+e.target.value)} style={rs} />
    </div>
  );
}

function Compare({ k, v, tone }: { k: string; v: string; tone: string }) {
  return (
    <div style={{ flex: 1, padding: 13, border: `1px solid ${color.line}`, borderRadius: 12, textAlign: "center", background: "rgba(255,255,255,0.02)" }}>
      <div style={{ fontFamily: font.mono, fontSize: 8.5, letterSpacing: "0.08em", color: color.mut, textTransform: "uppercase" }}>{k}</div>
      <div style={{ fontFamily: font.display, fontSize: 22, color: tone, marginTop: 4 }}>{v}</div>
    </div>
  );
}

function Mode({ k, d, sel, on }: { k: string; d: string; sel: boolean; on: () => void }) {
  return (
    <button onClick={on} style={{ flex: 1, padding: 12, borderRadius: 11, border: `1px solid ${sel ? color.cyan : color.line2}`, background: sel ? "rgba(63,217,212,0.07)" : "rgba(255,255,255,0.02)", cursor: "pointer", textAlign: "center" }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: color.txt }}>{k}</div>
      <div style={{ fontSize: 10, color: color.mut, marginTop: 3 }}>{d}</div>
    </button>
  );
}
