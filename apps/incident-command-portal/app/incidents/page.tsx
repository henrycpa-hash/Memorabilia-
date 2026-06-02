import { gatewayFetch, type SovereigntyIncident } from "../../lib/api";

export const dynamic = "force-dynamic";

export default async function IncidentsPage() {
  const incidents = (await gatewayFetch<SovereigntyIncident[]>("/api/sovereignty-incidents")) || [];
  const cardStyle = { background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 20 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, margin: 0, color: "#f8fafc" }}>All Incidents</h1>
      <p style={{ color: "#94a3b8", marginTop: -16 }}>
        Severity is escalated by sovereignty tier. Sovereign + air-gapped tiers automatically bump severity by one band.
      </p>

      <div style={cardStyle}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #334155", textAlign: "left" }}>
              <th style={{ padding: "8px 4px", color: "#94a3b8" }}>Title</th>
              <th style={{ padding: "8px 4px", color: "#94a3b8" }}>Type</th>
              <th style={{ padding: "8px 4px", color: "#94a3b8" }}>Class</th>
              <th style={{ padding: "8px 4px", color: "#94a3b8" }}>Base→Effective</th>
              <th style={{ padding: "8px 4px", color: "#94a3b8" }}>Status</th>
              <th style={{ padding: "8px 4px", color: "#94a3b8" }}>Regions</th>
              <th style={{ padding: "8px 4px", color: "#94a3b8" }}>Reg Data</th>
              <th style={{ padding: "8px 4px", color: "#94a3b8" }}>Linked</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((i) => (
              <tr key={i.id} style={{ borderBottom: "1px solid #334155" }}>
                <td style={{ padding: "10px 4px", color: "#e2e8f0" }}>{i.title}</td>
                <td style={{ padding: "10px 4px", fontSize: 11, color: "#cbd5f5" }}>{i.incidentType}</td>
                <td style={{ padding: "10px 4px", fontSize: 11 }}>
                  <span style={{ background: "#312e81", color: "#c7d2fe", padding: "2px 8px", borderRadius: 4 }}>
                    {i.sovereigntyClassKey}
                  </span>
                </td>
                <td style={{ padding: "10px 4px", fontSize: 12 }}>
                  <span style={{ color: "#94a3b8" }}>{i.baseSeverity}</span>
                  <span style={{ color: "#64748b" }}> → </span>
                  <span style={{ background: severityColor(i.severity), color: "#0f172a", padding: "1px 6px", borderRadius: 3, fontSize: 11, fontWeight: 600 }}>
                    {i.severity}
                  </span>
                </td>
                <td style={{ padding: "10px 4px", color: "#cbd5f5" }}>{i.status}</td>
                <td style={{ padding: "10px 4px", fontSize: 11, color: "#cbd5f5" }}>{i.affectedRegions.join(", ") || "—"}</td>
                <td style={{ padding: "10px 4px", fontSize: 11 }}>{i.involvesRegulatedData ? "yes" : "no"}</td>
                <td style={{ padding: "10px 4px", fontSize: 10, color: "#cbd5f5" }}>
                  {i.linkedLegalEscalationId ? "L " : ""}
                  {i.linkedRegulatorNoticeIds.length > 0 ? `R(${i.linkedRegulatorNoticeIds.length}) ` : ""}
                  {i.linkedResidencyReviewId ? "Res" : ""}
                </td>
              </tr>
            ))}
            {incidents.length === 0 && (
              <tr><td colSpan={8} style={{ padding: "24px 4px", color: "#64748b", textAlign: "center" }}>No incidents yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
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
