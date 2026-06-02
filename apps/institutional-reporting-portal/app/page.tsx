import Link from "next/link";
import { authedGet } from "../lib/api";

type Metrics = {
  market: { gmv: string; sales: number; auctionCloseSuccessRate: number };
  growth: { renderRolls: number; campaignLaunched: number; campaignCtr: number };
  trust: { disputes: number; settlementHolds: number; settlementHoldRate: number };
  totals: { facts: number };
};

function Card({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div style={{ padding: 18, background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 10 }}>
      <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 600, marginTop: 6, color: "#0f172a" }}>{value}</div>
      {hint ? <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{hint}</div> : null}
    </div>
  );
}

export default async function PortalHomePage() {
  const m = await authedGet<Metrics>("/api/warehouse/metrics");

  if (m === null) {
    return (
      <section>
        <h1 style={{ marginTop: 0 }}>Institutional Reporting</h1>
        <p style={{ color: "#475569" }}>
          Board-grade view of the CrownX Jewel platform. Sign in via the{" "}
          <a href={(process.env.NEXT_PUBLIC_VAULT_URL || "http://localhost:3003") + "/login"} style={{ color: "#1d4ed8" }}>
            Collector Vault
          </a>{" "}
          first — auth cookies are shared across CrownX apps.
        </p>
      </section>
    );
  }

  const pct = (n: number) => (n * 100).toFixed(1) + "%";

  return (
    <section>
      <h1 style={{ marginTop: 0, marginBottom: 4 }}>Institutional Reporting</h1>
      <p style={{ color: "#64748b", marginTop: 0 }}>
        Live KPIs across market, growth, and trust. Drill in via the nav for board-grade reports.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginTop: 24 }}>
        <Card label="GMV" value={`$${Number(m.market.gmv).toLocaleString()}`} hint="completed settlements" />
        <Card label="Sales" value={m.market.sales} />
        <Card label="Auction close success" value={pct(m.market.auctionCloseSuccessRate)} />
        <Card label="Settlement hold rate" value={pct(m.trust.settlementHoldRate)} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginTop: 16 }}>
        <Card label="Render rolls" value={m.growth.renderRolls} hint="share-card jobs" />
        <Card label="Campaigns launched" value={m.growth.campaignLaunched} />
        <Card label="Campaign CTR" value={pct(m.growth.campaignCtr)} />
        <Card label="Disputes opened" value={m.trust.disputes} />
      </div>

      <div style={{ marginTop: 32, display: "flex", gap: 12 }}>
        <Link
          href="/board"
          style={{
            padding: "10px 16px",
            background: "#0f172a",
            color: "#f8fafc",
            borderRadius: 8,
            textDecoration: "none",
            fontSize: 14
          }}
        >
          Generate board report
        </Link>
        <Link
          href="/risk"
          style={{
            padding: "10px 16px",
            background: "#ffffff",
            color: "#0f172a",
            border: "1px solid #cbd5e1",
            borderRadius: 8,
            textDecoration: "none",
            fontSize: 14
          }}
        >
          Risk & trust pack
        </Link>
      </div>
    </section>
  );
}
