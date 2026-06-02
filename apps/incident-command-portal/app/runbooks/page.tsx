import { gatewayFetch, type IncidentRunbookAction, type SovereigntyIncident } from "../../lib/api";

export const dynamic = "force-dynamic";

export default async function RunbooksPage() {
  const incidents = (await gatewayFetch<SovereigntyIncident[]>("/api/sovereignty-incidents")) || [];
  // Pull actions for the first 6 incidents in parallel
  const actionsByIncident = await Promise.all(
    incidents.slice(0, 6).map(async (i) => {
      const a = (await gatewayFetch<IncidentRunbookAction[]>(`/api/sovereignty-incidents/${i.id}/actions`)) || [];
      return { incident: i, actions: a };
    })
  );

  const cardStyle = { background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 20 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, margin: 0, color: "#f8fafc" }}>Runbook Action Progress</h1>
      <p style={{ color: "#94a3b8", marginTop: -16 }}>
        Each incident emits a deterministic action sequence based on classification. Actions fan out to legal-escalation, regulator-notice,
        data-residency, and sovereign-key-custody services.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
        {actionsByIncident.map(({ incident, actions }) => {
          const completed = actions.filter((a) => a.status === "completed").length;
          const queued = actions.filter((a) => a.status === "queued").length;
          const running = actions.filter((a) => a.status === "running").length;
          return (
            <div key={incident.id} style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <strong style={{ color: "#f8fafc" }}>{incident.title}</strong>
                <span style={{ color: "#94a3b8", fontSize: 12 }}>
                  {completed} done · {running} running · {queued} queued · runbook {actions[0]?.runbookKey || "—"}
                </span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #334155", textAlign: "left" }}>
                    <th style={{ padding: "6px 4px", color: "#94a3b8" }}>#</th>
                    <th style={{ padding: "6px 4px", color: "#94a3b8" }}>Action</th>
                    <th style={{ padding: "6px 4px", color: "#94a3b8" }}>Status</th>
                    <th style={{ padding: "6px 4px", color: "#94a3b8" }}>External Ref</th>
                    <th style={{ padding: "6px 4px", color: "#94a3b8" }}>Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {actions.map((a) => (
                    <tr key={a.id} style={{ borderBottom: "1px solid #1e293b" }}>
                      <td style={{ padding: "6px 4px", color: "#cbd5f5" }}>{a.sequence}</td>
                      <td style={{ padding: "6px 4px", color: "#e2e8f0" }}>{a.actionType}</td>
                      <td style={{ padding: "6px 4px" }}>
                        <span style={{ background: actionStatusColor(a.status), color: "#0f172a", padding: "1px 6px", borderRadius: 3, fontSize: 11 }}>
                          {a.status}
                        </span>
                      </td>
                      <td style={{ padding: "6px 4px", color: "#cbd5f5", fontFamily: "monospace", fontSize: 10 }}>
                        {a.externalRef ? a.externalRef.slice(0, 16) + "…" : "—"}
                      </td>
                      <td style={{ padding: "6px 4px", color: "#64748b", fontSize: 11 }}>
                        {a.completedAt ? new Date(a.completedAt).toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
        {actionsByIncident.length === 0 && (
          <div style={{ ...cardStyle, textAlign: "center", color: "#64748b" }}>No incidents with runbook actions yet.</div>
        )}
      </div>
    </div>
  );
}

function actionStatusColor(status: string): string {
  switch (status) {
    case "queued": return "#cbd5f5";
    case "running": return "#fde68a";
    case "completed": return "#86efac";
    case "skipped": return "#94a3b8";
    case "failed": return "#fca5a5";
    default: return "#cbd5f5";
  }
}
