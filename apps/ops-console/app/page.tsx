import { authedGet } from "../lib/api";

type Settlement = { id: string; settlementState: string };
type Dispute = { id: string; status: string };
type Alert = { id: string; status: string; severity: string };
type Campaign = { id: string; status: string };

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
        padding: 20,
        background: "#11141f",
        border: "1px solid #1f2433",
        borderRadius: 14
      }}
    >
      <div style={{ fontSize: 12, color: "#7d83a3", textTransform: "uppercase", letterSpacing: 0.6 }}>
        {label}
      </div>
      <div style={{ fontSize: 32, fontWeight: 600, marginTop: 8 }}>{value}</div>
      {hint ? (
        <div style={{ fontSize: 12, color: "#a4adcb", marginTop: 6 }}>{hint}</div>
      ) : null}
    </div>
  );
}

export default async function OpsHomePage() {
  const [settlements, disputes, alerts, campaigns] = await Promise.all([
    authedGet<Settlement[]>("/api/ops/settlements"),
    authedGet<Dispute[]>("/api/ops/disputes"),
    authedGet<Alert[]>("/api/fraud/alerts"),
    authedGet<Campaign[]>("/api/campaigns/live")
  ]);

  if (settlements === null) {
    return (
      <section>
        <h1>Ops Console</h1>
        <p style={{ color: "#a4adcb" }}>
          You&apos;re not signed in as an operator. Sign in via the{" "}
          <a
            href={
              (process.env.NEXT_PUBLIC_VAULT_URL || "http://localhost:3003") + "/login"
            }
            style={{ color: "#3a86ff" }}
          >
            Collector Vault
          </a>{" "}
          first — auth cookies are shared across CrownX apps.
        </p>
      </section>
    );
  }

  const openSettlements = settlements.filter(
    (s) =>
      s.settlementState === "on_hold" ||
      s.settlementState === "ready_for_release" ||
      s.settlementState === "payout_scheduled"
  ).length;
  const openDisputes = (disputes || []).filter(
    (d) => d.status === "open" || d.status === "in_review"
  ).length;
  const openAlerts = (alerts || []).filter((a) => a.status === "open").length;
  const liveCampaigns = (campaigns || []).filter((c) => c.status === "live").length;

  return (
    <section>
      <h1 style={{ margin: 0 }}>Ops Console</h1>
      <p style={{ color: "#a4adcb", marginTop: 6 }}>
        Operator-grade view of the CrownX Jewel marketplace. Wave 4 introduces
        settlement automation, fraud scoring, and creator campaigns — the
        signals below feed every screen in this app.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginTop: 24
        }}
      >
        <Card label="Open settlements" value={openSettlements} hint="held / ready / scheduled" />
        <Card label="Open disputes" value={openDisputes} hint="awaiting resolution" />
        <Card label="Open fraud alerts" value={openAlerts} hint="warning + critical" />
        <Card label="Live campaigns" value={liveCampaigns} hint="creator-driven growth" />
      </div>

      <div style={{ marginTop: 32, color: "#7d83a3", fontSize: 13 }}>
        Wave 4 ports: settlement-service 4015 · dispute-service 4016 ·
        fraud-risk 4017 · campaign 4018 · render 4019 · warehouse 4020 ·
        automation 4021. Use the nav above to drill in.
      </div>
    </section>
  );
}
