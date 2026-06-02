import { gatewayFetch, type LegalEscalation } from "../../lib/api";

export const dynamic = "force-dynamic";

export default async function EscalationsPage() {
  const escalations = (await gatewayFetch<LegalEscalation[]>("/api/legal-escalations")) || [];
  const cardStyle = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 20 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, margin: 0 }}>Legal Escalations</h1>
      <p style={{ color: "#4b5563", marginTop: -16 }}>
        Severity ladder, source attribution, playbook outputs. Notice obligation flag, legal hold flag, executive notification flag.
      </p>

      <div style={cardStyle}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
              <th style={{ padding: "8px 4px" }}>Severity</th>
              <th style={{ padding: "8px 4px" }}>Source</th>
              <th style={{ padding: "8px 4px" }}>Status</th>
              <th style={{ padding: "8px 4px" }}>Routing</th>
              <th style={{ padding: "8px 4px" }}>Flags</th>
              <th style={{ padding: "8px 4px" }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {escalations.slice(0, 30).map((e) => (
              <tr key={e.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "10px 4px" }}>
                  <span style={{ background: severityColor(e.severity), color: "#1c2541", padding: "2px 8px", borderRadius: 4, fontSize: 11 }}>
                    {e.severity}
                  </span>
                </td>
                <td style={{ padding: "10px 4px", fontSize: 12 }}>{e.sourceType} <span style={{ color: "#9ca3af" }}>{e.sourceId.slice(0, 10)}…</span></td>
                <td style={{ padding: "10px 4px" }}>{e.status}</td>
                <td style={{ padding: "10px 4px" }}>{e.playbook.routingTarget}</td>
                <td style={{ padding: "10px 4px", fontSize: 11 }}>
                  {e.playbook.noticeObligationCheck && <Flag color="#fef3c7">notice</Flag>}
                  {e.playbook.legalHoldRecommended && <Flag color="#fee2e2">hold</Flag>}
                  {e.playbook.executiveNotificationFlag && <Flag color="#dbeafe">exec</Flag>}
                </td>
                <td style={{ padding: "10px 4px", fontSize: 12, color: "#6b7280" }}>{new Date(e.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {escalations.length === 0 && (
              <tr><td colSpan={6} style={{ padding: "24px 4px", color: "#9ca3af", textAlign: "center" }}>No escalations yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Flag({ children, color }: { children: React.ReactNode; color: string }) {
  return <span style={{ background: color, padding: "1px 6px", borderRadius: 3, marginRight: 4 }}>{children}</span>;
}

function severityColor(severity: string): string {
  switch (severity) {
    case "advisory": return "#dcfce7";
    case "urgent_review": return "#fef3c7";
    case "legal_hold_candidate": return "#fed7aa";
    case "regulator_sensitive": return "#fecaca";
    case "executive_escalation": return "#fca5a5";
    default: return "#e5e7eb";
  }
}
