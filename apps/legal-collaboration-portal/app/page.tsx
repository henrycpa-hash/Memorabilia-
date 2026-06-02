import { gatewayFetch, type EscalationPipelineSummary, type RedlineWorkspace } from "../lib/api";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const workspaces = (await gatewayFetch<RedlineWorkspace[]>("/api/collab-redline/workspaces")) || [];
  const escSummary = (await gatewayFetch<EscalationPipelineSummary>("/api/legal-escalations/pipeline-summary"))
    || { totalEscalations: 0, bySeverity: {}, byStatus: {}, pendingNoticeObligations: 0, pendingLegalHolds: 0 };

  const cardStyle = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 20, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" };
  const labelStyle = { fontSize: 12, textTransform: "uppercase" as const, letterSpacing: 1, color: "#6b7280" };
  const valueStyle = { fontSize: 32, fontWeight: 600 as const, marginTop: 8 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, margin: 0 }}>Legal Collaboration Dashboard</h1>
      <p style={{ color: "#4b5563", marginTop: -16 }}>
        Live state of redlining workspaces and legal escalations. Reviewer activity, clause positions, checkpoints, and playbook outputs.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <div style={cardStyle}>
          <div style={labelStyle}>Active Workspaces</div>
          <div style={valueStyle}>{workspaces.filter((w) => w.status !== "abandoned" && w.status !== "promoted_to_signature").length}</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>Promoted to Signature</div>
          <div style={valueStyle}>{workspaces.filter((w) => w.status === "promoted_to_signature").length}</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>Open Escalations</div>
          <div style={valueStyle}>{(escSummary.byStatus.open || 0) + (escSummary.byStatus.routed_internal || 0) + (escSummary.byStatus.routed_external || 0)}</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>Pending Notice Obligations</div>
          <div style={valueStyle}>{escSummary.pendingNoticeObligations}</div>
        </div>
      </div>

      <section style={cardStyle}>
        <h2 style={{ fontSize: 18, margin: "0 0 12px 0" }}>Recent Workspaces</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
              <th style={{ padding: "8px 4px" }}>Agreement</th>
              <th style={{ padding: "8px 4px" }}>Status</th>
              <th style={{ padding: "8px 4px" }}>Reviewers</th>
              <th style={{ padding: "8px 4px" }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {workspaces.slice(0, 8).map((w) => (
              <tr key={w.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "10px 4px", fontFamily: "monospace", fontSize: 12 }}>{w.agreementId.slice(0, 16)}…</td>
                <td style={{ padding: "10px 4px" }}>
                  <span style={{ background: w.status === "approved" ? "#dcfce7" : w.status === "checkpoint_pending" ? "#fef3c7" : "#e0e7ff", padding: "2px 8px", borderRadius: 4, fontSize: 12 }}>
                    {w.status}
                  </span>
                </td>
                <td style={{ padding: "10px 4px" }}>{w.reviewers.length}</td>
                <td style={{ padding: "10px 4px", fontSize: 12, color: "#6b7280" }}>{new Date(w.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {workspaces.length === 0 && (
              <tr><td colSpan={4} style={{ padding: "24px 4px", color: "#9ca3af", textAlign: "center" }}>No workspaces yet.</td></tr>
            )}
          </tbody>
        </table>
      </section>

      <section style={cardStyle}>
        <h2 style={{ fontSize: 18, margin: "0 0 12px 0" }}>Escalation Severity Mix</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
          {(["advisory", "urgent_review", "legal_hold_candidate", "regulator_sensitive", "executive_escalation"] as const).map((sev) => (
            <div key={sev} style={{ background: "#f9fafb", borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase" as const, color: "#6b7280" }}>{sev.replace(/_/g, " ")}</div>
              <div style={{ fontSize: 24, fontWeight: 600 as const, marginTop: 4 }}>{escSummary.bySeverity[sev] || 0}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
