import { gatewayFetch, type RedlineWorkspace, type WorkspaceSummary } from "../../lib/api";

export const dynamic = "force-dynamic";

export default async function WorkspacesPage() {
  const workspaces = (await gatewayFetch<RedlineWorkspace[]>("/api/collab-redline/workspaces")) || [];
  // Pull summaries in parallel for the first 6 workspaces
  const summaries = await Promise.all(
    workspaces.slice(0, 6).map((w) =>
      gatewayFetch<WorkspaceSummary>(`/api/collab-redline/workspaces/${w.id}/summary`)
    )
  );

  const cardStyle = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 20 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, margin: 0 }}>Redlining Workspaces</h1>
      <p style={{ color: "#4b5563", marginTop: -16 }}>
        Per-workspace summary: open comments, clause positions, latest checkpoint state. Promote-to-signature when final approval lands.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
        {summaries.filter((s): s is WorkspaceSummary => !!s).map((s) => (
          <div key={s.workspace.id} style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <strong style={{ fontFamily: "monospace", fontSize: 13 }}>{s.workspace.agreementId.slice(0, 16)}…</strong>
              <span style={{ background: "#e0e7ff", padding: "2px 8px", borderRadius: 4, fontSize: 11 }}>{s.workspace.status}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 12 }}>
              <Stat label="Open" value={s.openComments} />
              <Stat label="Total" value={s.totalComments} />
              <Stat label="Positions" value={s.totalPositions} />
              <Stat label="Checkpoints" value={s.checkpoints} />
            </div>
            {s.latestCheckpoint && (
              <div style={{ marginTop: 12, padding: 8, background: "#f9fafb", borderRadius: 6, fontSize: 12 }}>
                <div style={{ color: "#6b7280" }}>Latest checkpoint</div>
                <div><strong>{s.latestCheckpoint.checkpointType}</strong> — {s.latestCheckpoint.status}</div>
                <div style={{ color: "#9ca3af", marginTop: 4 }}>
                  {s.latestCheckpoint.snapshot.unresolvedComments} unresolved · {s.latestCheckpoint.snapshot.clausesWithPositions} clauses with positions
                </div>
              </div>
            )}
          </div>
        ))}
        {summaries.length === 0 && (
          <div style={{ ...cardStyle, gridColumn: "1 / -1", textAlign: "center", color: "#9ca3af" }}>No workspaces yet.</div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div style={{ fontSize: 11, textTransform: "uppercase", color: "#6b7280" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600 }}>{value}</div>
    </div>
  );
}
