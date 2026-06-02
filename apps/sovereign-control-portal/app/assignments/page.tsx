import { publicGet } from "../../lib/api";

type Assignment = { id: string; tenantId: string; sovereignClassId: string; classKey: string; status: string; createdAt: string; updatedAt: string };
type Promotion = { id: string; tenantId: string; fromEnvironment: string; toEnvironment: string; status: string; rationale: string; createdAt: string };

const STATUS_COLORS: Record<string, string> = {
  active: "#15803d",
  transitioning: "#b45309",
  suspended: "#b91c1c",
  decommissioned: "#64748b",
  pending: "#0369a1",
  auto_approved: "#15803d",
  approved: "#15803d",
  denied: "#b91c1c"
};

export default async function AssignmentsPage() {
  const [assignments, promotions] = await Promise.all([
    publicGet<Assignment[]>("/api/sovereign/assignments"),
    publicGet<Promotion[]>("/api/sovereign/promotions")
  ]);
  const a = assignments || [];
  const p = promotions || [];
  return (
    <section>
      <h1 style={{ marginTop: 0 }}>Tenant Assignments ({a.length})</h1>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, marginTop: 16 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>
            <th style={{ padding: 10 }}>tenant</th>
            <th style={{ padding: 10 }}>class</th>
            <th style={{ padding: 10 }}>status</th>
            <th style={{ padding: 10 }}>assigned</th>
            <th style={{ padding: 10 }}>updated</th>
          </tr>
        </thead>
        <tbody>
          {a.map((x) => (
            <tr key={x.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: 10, fontFamily: "monospace", fontSize: 11 }}>{x.tenantId.slice(0, 14)}</td>
              <td style={{ padding: 10, fontWeight: 600 }}>{x.classKey}</td>
              <td style={{ padding: 10, color: STATUS_COLORS[x.status], fontWeight: 600, fontSize: 12 }}>{x.status}</td>
              <td style={{ padding: 10, fontSize: 12, color: "#64748b" }}>{new Date(x.createdAt).toLocaleString()}</td>
              <td style={{ padding: 10, fontSize: 12, color: "#64748b" }}>{new Date(x.updatedAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ marginTop: 36, fontSize: 18 }}>Promotion Requests ({p.length})</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>
            <th style={{ padding: 10 }}>tenant</th>
            <th style={{ padding: 10 }}>from</th>
            <th style={{ padding: 10 }}>to</th>
            <th style={{ padding: 10 }}>status</th>
            <th style={{ padding: 10 }}>rationale</th>
          </tr>
        </thead>
        <tbody>
          {p.map((r) => (
            <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: 10, fontFamily: "monospace", fontSize: 11 }}>{r.tenantId.slice(0, 14)}</td>
              <td style={{ padding: 10 }}>{r.fromEnvironment}</td>
              <td style={{ padding: 10, fontWeight: 600 }}>{r.toEnvironment}</td>
              <td style={{ padding: 10, color: STATUS_COLORS[r.status], fontWeight: 600, fontSize: 12 }}>{r.status}</td>
              <td style={{ padding: 10, fontSize: 12, color: "#475569" }}>{r.rationale}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
