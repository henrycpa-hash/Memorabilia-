import { publicGet } from "../../lib/api";

type WriteOff = {
  id: string;
  receivableId: string;
  amountCents: number;
  reason: string;
  status: string;
  approverUserId: string | null;
  decisionAt: string | null;
  createdAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  draft: "#64748b",
  submitted: "#0369a1",
  approved: "#15803d",
  rejected: "#b91c1c"
};

export default async function WriteOffsPage() {
  const writeoffs = await publicGet<WriteOff[]>("/api/collections/writeoffs") || [];
  const totalCents = writeoffs
    .filter((w) => w.status === "approved")
    .reduce((a, w) => a + w.amountCents, 0);
  return (
    <section>
      <h1 style={{ marginTop: 0 }}>Write-Off Pipeline ({writeoffs.length})</h1>
      <p style={{ color: "#78716c" }}>
        Approved write-offs total: <strong>${(totalCents / 100).toLocaleString()}</strong>
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, marginTop: 16 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "#78716c", borderBottom: "1px solid #e7e5e4" }}>
            <th style={{ padding: 10 }}>id</th>
            <th style={{ padding: 10 }}>receivable</th>
            <th style={{ padding: 10 }}>amount</th>
            <th style={{ padding: 10 }}>reason</th>
            <th style={{ padding: 10 }}>status</th>
            <th style={{ padding: 10 }}>approver</th>
            <th style={{ padding: 10 }}>decided</th>
          </tr>
        </thead>
        <tbody>
          {writeoffs.map((w) => (
            <tr key={w.id} style={{ borderBottom: "1px solid #f5f5f4" }}>
              <td style={{ padding: 10, fontFamily: "monospace", fontSize: 11 }}>{w.id.slice(0, 10)}</td>
              <td style={{ padding: 10, fontFamily: "monospace", fontSize: 11 }}>{w.receivableId.slice(0, 10)}</td>
              <td style={{ padding: 10, fontWeight: 600 }}>${(w.amountCents / 100).toFixed(2)}</td>
              <td style={{ padding: 10, color: "#78716c", fontSize: 13 }}>{w.reason}</td>
              <td style={{ padding: 10, color: STATUS_COLORS[w.status], fontWeight: 600, fontSize: 12 }}>{w.status}</td>
              <td style={{ padding: 10, fontFamily: "monospace", fontSize: 11 }}>{w.approverUserId?.slice(0, 10) || "—"}</td>
              <td style={{ padding: 10, fontSize: 12, color: "#78716c" }}>
                {w.decisionAt ? new Date(w.decisionAt).toLocaleString() : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
