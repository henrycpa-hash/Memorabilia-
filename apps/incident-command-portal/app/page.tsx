import { gatewayFetch, type IncidentPipelineSummary, type SovereigntyIncident, type IncidentRunbookAction } from "../lib/api";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const summary = (await gatewayFetch<IncidentPipelineSummary>("/api/sovereignty-incidents/pipeline-summary"))
    || { totalIncidents: 0, byStatus: {}, bySeverity: {}, bySovereigntyClass: {}, totalActions: 0, pendingActions: 0, totalPostmortems: 0 };
  const incidents = (await gatewayFetch<SovereigntyIncident[]>("/api/sovereignty-incidents")) || [];
  const recent = incidents.slice(0, 8);

  const cardStyle = { background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 20 };
  const labelStyle = { fontSize: 11, textTransform: "uppercase" as const, letterSpacing: 1, color: "#94a3b8" };
  const valueStyle = { fontSize: 32, fontWeight: 600 as const, marginTop: 8, color: "#f8fafc" };

  const activeCount = (summary.byStatus.triaging || 0) + (summary.byStatus.active || 0) + (summary.byStatus.remediating || 0);
  const criticalCount = summary.bySeverity.critical || 0;
  const containedCount = summary.byStatus.contained || 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, margin: 0, color: "#f8fafc" }}>Incident Command Dashboard</h1>
      <p style={{ color: "#94a3b8", marginTop: -16 }}>
        Live state of sovereignty-class incidents, runbook fan-out, and postmortem queue. Severity escalates per sovereignty tier.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <div style={cardStyle}>
          <div style={labelStyle}>Active Incidents</div>
          <div style={{ ...valueStyle, color: activeCount > 0 ? "#fca5a5" : "#94a3b8" }}>{activeCount}</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>Critical Severity</div>
          <div style={{ ...valueStyle, color: criticalCount > 0 ? "#f87171" : "#94a3b8" }}>{criticalCount}</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>Contained</div>
          <div style={{ ...valueStyle, color: "#86efac" }}>{containedCount}</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>Pending Runbook Actions</div>
          <div style={valueStyle}>{summary.pendingActions}</div>
        </div>
      </div>

      <section style={cardStyle}>
        <h2 style={{ fontSize: 18, margin: "0 0 16px 0", color: "#f8fafc" }}>Sovereignty Class Distribution</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {(["commercial", "regulated_enterprise", "sovereign_dedicated", "air_gapped"] as const).map((c) => (
            <div key={c} style={{ background: "#0f172a", borderRadius: 8, padding: 14, border: "1px solid #334155" }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", color: "#94a3b8" }}>{c.replace(/_/g, " ")}</div>
              <div style={{ fontSize: 28, fontWeight: 600, marginTop: 6, color: "#e2e8f0" }}>{summary.bySovereigntyClass[c] || 0}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={cardStyle}>
        <h2 style={{ fontSize: 18, margin: "0 0 16px 0", color: "#f8fafc" }}>Recent Incidents</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #334155", textAlign: "left" }}>
              <th style={{ padding: "8px 4px", color: "#94a3b8" }}>Title</th>
              <th style={{ padding: "8px 4px", color: "#94a3b8" }}>Class</th>
              <th style={{ padding: "8px 4px", color: "#94a3b8" }}>Severity</th>
              <th style={{ padding: "8px 4px", color: "#94a3b8" }}>Status</th>
              <th style={{ padding: "8px 4px", color: "#94a3b8" }}>Linked</th>
              <th style={{ padding: "8px 4px", color: "#94a3b8" }}>Opened</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((i) => (
              <tr key={i.id} style={{ borderBottom: "1px solid #334155" }}>
                <td style={{ padding: "10px 4px", color: "#e2e8f0" }}>{i.title}</td>
                <td style={{ padding: "10px 4px", fontSize: 11 }}>
                  <span style={{ background: "#312e81", color: "#c7d2fe", padding: "2px 8px", borderRadius: 4 }}>
                    {i.sovereigntyClassKey}
                  </span>
                </td>
                <td style={{ padding: "10px 4px" }}>
                  <span style={{ background: severityColor(i.severity), color: "#0f172a", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                    {i.severity}
                  </span>
                </td>
                <td style={{ padding: "10px 4px", color: "#cbd5f5" }}>{i.status}</td>
                <td style={{ padding: "10px 4px", fontSize: 11 }}>
                  {i.linkedLegalEscalationId && <Flag>legal</Flag>}
                  {i.linkedRegulatorNoticeIds.length > 0 && <Flag>{i.linkedRegulatorNoticeIds.length} notice</Flag>}
                  {i.linkedResidencyReviewId && <Flag>residency</Flag>}
                </td>
                <td style={{ padding: "10px 4px", fontSize: 11, color: "#64748b" }}>{new Date(i.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {recent.length === 0 && (
              <tr><td colSpan={6} style={{ padding: "24px 4px", color: "#64748b", textAlign: "center" }}>No incidents yet.</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Flag({ children }: { children: React.ReactNode }) {
  return <span style={{ background: "#0f172a", border: "1px solid #475569", color: "#cbd5f5", padding: "1px 6px", borderRadius: 3, marginRight: 4 }}>{children}</span>;
}

function severityColor(severity: string): string {
  switch (severity) {
    case "low": return "#bef264";
    case "medium": return "#fde68a";
    case "high": return "#fca5a5";
    case "critical": return "#f87171";
    default: return "#cbd5f5";
  }
}
