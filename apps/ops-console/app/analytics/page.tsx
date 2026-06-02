import { publicGet } from "../../lib/api";

type Metrics = {
  market: {
    gmv: string;
    sales: number;
    auctionClosures: number;
    auctionCloseSuccessRate: number;
  };
  growth: {
    renderRolls: number;
    campaignLaunched: number;
    campaignClicked: number;
    campaignConverted: number;
    campaignCtr: number;
  };
  trust: {
    disputes: number;
    settlementHolds: number;
    fraudFlags: number;
    disputeRate: number;
    settlementHoldRate: number;
  };
  totals: { facts: number };
};

function Card({
  label,
  value,
  hint
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div
      style={{
        padding: 18,
        background: "#11141f",
        border: "1px solid #1f2433",
        borderRadius: 12
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: "#7d83a3",
          textTransform: "uppercase",
          letterSpacing: 0.6
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 600, marginTop: 8 }}>{value}</div>
      {hint ? (
        <div style={{ fontSize: 12, color: "#a4adcb", marginTop: 4 }}>
          {hint}
        </div>
      ) : null}
    </div>
  );
}

export default async function AnalyticsPage() {
  const m = await publicGet<Metrics>("/api/warehouse/metrics");

  if (!m) {
    return (
      <section>
        <h1>Analytics</h1>
        <p style={{ color: "#a4adcb" }}>
          Warehouse service unreachable. Make sure analytics-warehouse-service
          is running on port 4020.
        </p>
      </section>
    );
  }

  const pct = (n: number) => (n * 100).toFixed(1) + "%";

  return (
    <section>
      <h1 style={{ margin: 0 }}>Analytics</h1>
      <p style={{ color: "#a4adcb", marginTop: 6 }}>
        Wave 4 KPIs. Computed on-the-fly from the fact_market_events store.
        Wave 5 swaps to pre-aggregated rollups.
      </p>

      <h2 style={{ marginTop: 24, fontSize: 16, color: "#cdd2ec" }}>Market</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14
        }}
      >
        <Card label="GMV" value={`$${Number(m.market.gmv).toLocaleString()}`} />
        <Card label="Sales" value={m.market.sales} />
        <Card label="Auction closures" value={m.market.auctionClosures} />
        <Card
          label="Auction close success"
          value={pct(m.market.auctionCloseSuccessRate)}
        />
      </div>

      <h2 style={{ marginTop: 28, fontSize: 16, color: "#cdd2ec" }}>Growth</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14
        }}
      >
        <Card label="Share cards rendered" value={m.growth.renderRolls} />
        <Card label="Campaigns launched" value={m.growth.campaignLaunched} />
        <Card label="Campaign clicks" value={m.growth.campaignClicked} />
        <Card label="Campaign CTR" value={pct(m.growth.campaignCtr)} />
      </div>

      <h2 style={{ marginTop: 28, fontSize: 16, color: "#cdd2ec" }}>Trust</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14
        }}
      >
        <Card label="Disputes opened" value={m.trust.disputes} />
        <Card label="Settlements held" value={m.trust.settlementHolds} />
        <Card label="Fraud flags raised" value={m.trust.fraudFlags} />
        <Card
          label="Settlement hold rate"
          value={pct(m.trust.settlementHoldRate)}
        />
      </div>

      <p style={{ color: "#7d83a3", marginTop: 24, fontSize: 13 }}>
        Total facts in warehouse: <strong>{m.totals.facts}</strong>
      </p>
    </section>
  );
}
