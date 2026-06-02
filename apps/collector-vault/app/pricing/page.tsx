import Link from "next/link";
import { listConsumerTiers, formatUsdCents, type ConsumerTier } from "@crownx-jewel/shared-pricing";
import { SectionTag, Panel, Badge, ButtonLink, color, font } from "@crownx-jewel/shared-design";
import { BuyoutCalculator } from "./BuyoutCalculator";

export const metadata = { title: "CrownX Vault — Pricing" };

export default function PricingPage() {
  const tiers = listConsumerTiers();
  return (
    <div>
      <section style={{ textAlign: "center", padding: "20px 0 8px" }}>
        <SectionTag>Pricing</SectionTag>
        <h1 style={{ fontFamily: font.display, fontWeight: 400, fontSize: "clamp(36px,6vw,60px)", margin: "0 0 6px" }}>
          One price ladder. Three ways to earn more.
        </h1>
        <p style={{ color: color.mut, maxWidth: 640, margin: "0 auto" }}>
          Your <b style={{ color: color.txt }}>subscription</b> is the base. Better royalty keep and a royalty buyout are
          <b style={{ color: color.txt }}> separate, stacking additions</b> — never changes to the fixed 10% rate.
        </p>
      </section>

      {/* subscription tiers — numbers come FROM @crownx-jewel/shared-pricing */}
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", marginTop: 24, alignItems: "start" }}>
        {tiers.map((t) => (
          <TierCard key={t.key} tier={t} />
        ))}
      </div>

      {/* royalty additions */}
      <section style={{ marginTop: 40 }}>
        <SectionTag>The two additions</SectionTag>
        <h2 style={{ fontFamily: font.display, fontWeight: 400, fontSize: 34, margin: "0 0 6px" }}>Better royalties &amp; buyouts are priced separately</h2>
        <p style={{ color: color.mut, maxWidth: 640, margin: "0 0 18px" }}>
          The fixed 10% lifetime royalty never changes. What you can buy is a bigger <b style={{ color: color.txt }}>share of that 10%</b> (a
          monthly add-on, up to 85%), or a one-time <b style={{ color: color.txt }}>buyout</b> that converts your future stream into a lump sum today.
        </p>
        <Panel>
          <BuyoutCalculator />
        </Panel>
      </section>

      <Panel style={{ marginTop: 20, borderColor: "rgba(217,168,46,0.4)", borderStyle: "dashed", background: "rgba(217,168,46,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <Badge tone="gold">Enterprise billing untouched</Badge>
          <p style={{ color: color.mut, fontSize: 13, margin: 0, flex: 1, minWidth: 240 }}>
            These are <b style={{ color: color.txt }}>consumer</b> plans. Organization/tenant SaaS billing (settlements, seats, metering)
            is a separate, locked system and is unaffected.
          </p>
        </div>
      </Panel>
    </div>
  );
}

function TierCard({ tier }: { tier: ConsumerTier }) {
  const highlight = tier.highlight;
  return (
    <div
      style={{
        background: highlight ? "linear-gradient(165deg, rgba(63,217,212,0.08), rgba(255,255,255,0.01))" : "linear-gradient(165deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
        border: `1px solid ${highlight ? "rgba(63,217,212,0.5)" : color.line}`,
        borderRadius: 16,
        padding: 22,
        position: "relative",
        boxShadow: highlight ? "0 0 40px -16px rgba(63,217,212,0.5)" : undefined
      }}
    >
      {highlight && (
        <div style={{ position: "absolute", top: -10, right: 16 }}>
          <Badge tone="cyan">Most popular</Badge>
        </div>
      )}
      <div style={{ fontFamily: font.display, fontSize: 26, letterSpacing: "0.02em" }}>{tier.name}</div>
      <div style={{ fontFamily: font.mono, fontSize: 10, color: color.mut, letterSpacing: "0.06em", marginTop: 2 }}>{tier.bestFor}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 14 }}>
        <span style={{ fontFamily: font.display, fontSize: 44, color: color.cyanHi, lineHeight: 0.9 }}>
          {tier.monthlyPriceCents === 0 ? "Free" : formatUsdCents(tier.monthlyPriceCents)}
        </span>
        {tier.monthlyPriceCents > 0 && <span style={{ color: color.mut, fontSize: 13 }}>/mo</span>}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        {tier.trialDays > 0 && <Badge tone="win">{tier.trialDays}-day trial</Badge>}
        <Badge tone="gold">Mint {formatUsdCents(tier.mintFeeCents)}</Badge>
        <Badge tone="mut">Keep {(tier.baseRoyaltyKeepBps / 100).toFixed(0)}–{(tier.maxRoyaltyKeepBps / 100).toFixed(0)}%</Badge>
      </div>

      <ul style={{ listStyle: "none", padding: 0, margin: "16px 0 0", display: "grid", gap: 8 }}>
        {tier.features.map((f, i) => (
          <li key={i} style={{ display: "flex", gap: 8, fontSize: 12.5, color: color.txt }}>
            <span style={{ color: color.cyan, flex: "none" }}>✦</span>
            <span style={{ color: color.mut }}>{f}</span>
          </li>
        ))}
      </ul>

      <ButtonLink href="/login" as={Link} variant={highlight ? "primary" : "secondary"} style={{ width: "100%", marginTop: 18 }}>
        {tier.monthlyPriceCents === 0 ? "Start free" : `Choose ${tier.name}`}
      </ButtonLink>
    </div>
  );
}
