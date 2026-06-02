import { publicGet } from "../../lib/api";

type Control = { id: string; tenantId: string; controlType: string; rules: { blockAll: boolean; allowedDestinations: string[]; blockedDestinations: string[]; reviewRequired: boolean }; createdAt: string };
type ExportEval = { id: string; tenantId: string; controlType: string; destinationRegion: string; evaluation: { decision: string; reasons: string[] }; createdAt: string };

const DECISION_COLORS: Record<string, string> = {
  allow: "#15803d",
  review_required: "#b45309",
  deny: "#b91c1c"
};

export default async function ExportControlsPage() {
  const [controls, evals] = await Promise.all([
    publicGet<Control[]>("/api/sovereign/export-controls"),
    publicGet<ExportEval[]>("/api/sovereign/export-controls/evaluations?limit=30")
  ]);
  const c = controls || [];
  const e = evals || [];
  return (
    <section>
      <h1 style={{ marginTop: 0 }}>Export Controls ({c.length})</h1>
      <p style={{ color: "#64748b" }}>Per-tenant rules govern data, code, key-material, personnel, and subprocessor routing exports.</p>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, marginTop: 16 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>
            <th style={{ padding: 10 }}>tenant</th>
            <th style={{ padding: 10 }}>control</th>
            <th style={{ padding: 10 }}>block all</th>
            <th style={{ padding: 10 }}>allowed</th>
            <th style={{ padding: 10 }}>blocked</th>
            <th style={{ padding: 10 }}>review</th>
          </tr>
        </thead>
        <tbody>
          {c.map((x) => (
            <tr key={x.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: 10, fontFamily: "monospace", fontSize: 11 }}>{x.tenantId.slice(0, 14)}</td>
              <td style={{ padding: 10, fontWeight: 600 }}>{x.controlType}</td>
              <td style={{ padding: 10, color: x.rules.blockAll ? "#b91c1c" : "#0f172a", fontWeight: 600, fontSize: 12 }}>
                {x.rules.blockAll ? "yes" : "no"}
              </td>
              <td style={{ padding: 10, fontFamily: "monospace", fontSize: 11 }}>{x.rules.allowedDestinations.join(", ") || "—"}</td>
              <td style={{ padding: 10, fontFamily: "monospace", fontSize: 11, color: "#b91c1c" }}>{x.rules.blockedDestinations.join(", ") || "—"}</td>
              <td style={{ padding: 10, fontSize: 12 }}>{x.rules.reviewRequired ? "required" : "auto"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ marginTop: 36, fontSize: 18 }}>Recent Evaluations ({e.length})</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>
            <th style={{ padding: 10 }}>tenant</th>
            <th style={{ padding: 10 }}>control</th>
            <th style={{ padding: 10 }}>destination</th>
            <th style={{ padding: 10 }}>decision</th>
            <th style={{ padding: 10 }}>reasons</th>
            <th style={{ padding: 10 }}>at</th>
          </tr>
        </thead>
        <tbody>
          {e.map((x) => (
            <tr key={x.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: 10, fontFamily: "monospace", fontSize: 11 }}>{x.tenantId.slice(0, 12)}</td>
              <td style={{ padding: 10 }}>{x.controlType}</td>
              <td style={{ padding: 10, fontWeight: 600 }}>{x.destinationRegion}</td>
              <td style={{ padding: 10, color: DECISION_COLORS[x.evaluation.decision], fontWeight: 600, fontSize: 12 }}>{x.evaluation.decision}</td>
              <td style={{ padding: 10, fontSize: 12, color: "#64748b" }}>{x.evaluation.reasons[0] || "—"}</td>
              <td style={{ padding: 10, fontSize: 11, color: "#64748b" }}>{new Date(x.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
