"use client";

import { useMemo, useState } from "react";
import {
  quoteRoyaltyBuyout,
  composePriceBreakdown,
  availableKeepAddons,
  effectiveKeepBps,
  formatUsdCents,
  type ConsumerTierKey
} from "@crownx-jewel/shared-pricing";
import { color, font, buttonStyle, Badge } from "@crownx-jewel/shared-design";

/**
 * The two "additions to the price" made tangible, computed entirely from
 * @crownx-jewel/shared-pricing (numbers come FROM the code):
 *   • royalty-keep add-on  → raises your share of the 10%
 *   • royalty buyout        → lump-sum present value of your future stream
 */
export function BuyoutCalculator() {
  const [tier, setTier] = useState<ConsumerTierKey>("legacy");
  const [trailingUsd, setTrailingUsd] = useState(1200); // $/yr realized royalty
  const [keepAddonKey, setKeepAddonKey] = useState<string | undefined>(undefined);
  const [growthPct, setGrowthPct] = useState(6);
  const [horizon, setHorizon] = useState(10);

  const addons = availableKeepAddons(tier);

  const quote = useMemo(
    () =>
      quoteRoyaltyBuyout({
        trailing12moRoyaltyCents: Math.round(trailingUsd * 100),
        tier,
        keepAddonKey,
        expectedAnnualGrowth: growthPct / 100,
        horizonYears: horizon
      }),
    [tier, trailingUsd, keepAddonKey, growthPct, horizon]
  );

  const breakdown = useMemo(
    () => composePriceBreakdown({ tier, keepAddonKey, buyoutOfferCents: quote.offerCents }),
    [tier, keepAddonKey, quote.offerCents]
  );

  const keepPct = (effectiveKeepBps(tier, keepAddonKey) / 100).toFixed(0);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "rgba(255,255,255,0.05)",
    color: color.txt,
    border: `1px solid ${color.line2}`,
    padding: "10px 12px",
    borderRadius: 10,
    fontSize: 14,
    fontFamily: font.body
  };
  const labelStyle: React.CSSProperties = { fontFamily: font.mono, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: color.mut, display: "block", marginBottom: 6 };

  return (
    <div style={{ display: "grid", gap: 18, gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)" }}>
      {/* controls */}
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <label style={labelStyle}>Plan</label>
          <div style={{ display: "flex", gap: 8 }}>
            {(["free", "premium", "legacy"] as ConsumerTierKey[]).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTier(t);
                  setKeepAddonKey(undefined);
                }}
                style={{
                  flex: 1,
                  padding: "9px",
                  borderRadius: 10,
                  border: `1px solid ${tier === t ? color.cyan : color.line}`,
                  background: tier === t ? "rgba(63,217,212,0.08)" : "transparent",
                  color: tier === t ? color.cyanHi : color.mut,
                  fontFamily: font.mono,
                  fontSize: 11,
                  letterSpacing: "0.06em",
                  textTransform: "capitalize",
                  cursor: "pointer"
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle}>Royalty keep upgrade (a different price)</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => setKeepAddonKey(undefined)} style={chip(!keepAddonKey)}>Baseline</button>
            {addons.map((a) => (
              <button key={a.key} onClick={() => setKeepAddonKey(a.key)} style={chip(keepAddonKey === a.key)}>
                {a.name} {a.monthlyPriceCents ? `· ${formatUsdCents(a.monthlyPriceCents)}/mo` : "· included"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle}>Trailing 12-mo royalty income — ${trailingUsd.toLocaleString()}</label>
          <input type="range" min={0} max={20000} step={100} value={trailingUsd} onChange={(e) => setTrailingUsd(+e.target.value)} style={{ width: "100%", accentColor: color.cyan }} />
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Growth {growthPct}%/yr</label>
            <input type="range" min={0} max={20} value={growthPct} onChange={(e) => setGrowthPct(+e.target.value)} style={{ width: "100%", accentColor: color.cyan }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Horizon {horizon} yrs</label>
            <input type="range" min={3} max={30} value={horizon} onChange={(e) => setHorizon(+e.target.value)} style={{ width: "100%", accentColor: color.cyan }} />
          </div>
        </div>
      </div>

      {/* result */}
      <div style={{ background: color.ink, border: `1px solid ${color.line}`, borderRadius: 16, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: color.gold }}>Buyout offer</span>
          <Badge tone="cyan">Keep {keepPct}%</Badge>
        </div>
        <div style={{ fontFamily: font.display, fontSize: 52, lineHeight: 0.9, color: color.goldHi, marginTop: 8 }}>{quote.display.offer}</div>
        <div style={{ fontFamily: font.mono, fontSize: 11, color: color.mut, marginTop: 4 }}>
          {quote.effectiveMultiple}× trailing · {(quote.discountAnnualRate * 100).toFixed(0)}% discount rate · {quote.horizonYears}-yr DCF
        </div>

        <div style={{ borderTop: `1px solid ${color.line}`, marginTop: 16, paddingTop: 12 }}>
          {breakdown.lineItems.map((li, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "6px 0" }}>
              <span style={{ fontSize: 12.5, color: color.txt }}>
                {li.label}
                {li.detail && <span style={{ color: color.mut2, fontSize: 10, display: "block", fontFamily: font.mono }}>{li.detail}</span>}
              </span>
              <span style={{ fontFamily: font.mono, fontSize: 12, color: li.kind === "buyout" ? color.goldHi : color.txt, whiteSpace: "nowrap" }}>
                {li.oneTimeCents ? `${formatUsdCents(li.oneTimeCents)} once` : `${formatUsdCents(li.monthlyCents)}/mo`}
              </span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${color.line2}`, marginTop: 8, paddingTop: 10 }}>
          <span style={{ fontFamily: font.mono, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: color.mut }}>Totals</span>
          <span style={{ fontFamily: font.display, fontSize: 18, color: color.cyanHi }}>
            {breakdown.display.monthlyTotal}/mo + {breakdown.display.oneTimeTotal} once
          </span>
        </div>
        <a href="/dashboard" style={{ ...buttonStyle("gold"), width: "100%", marginTop: 14 }}>Request buyout →</a>
      </div>
    </div>
  );
}

function chip(active: boolean): React.CSSProperties {
  return {
    padding: "8px 12px",
    borderRadius: 999,
    border: `1px solid ${active ? color.gold : color.line2}`,
    background: active ? "rgba(217,168,46,0.1)" : "transparent",
    color: active ? color.goldHi : color.mut,
    fontFamily: font.mono,
    fontSize: 10,
    letterSpacing: "0.04em",
    cursor: "pointer"
  };
}
