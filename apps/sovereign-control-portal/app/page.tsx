import { publicGet } from "../lib/api";

type SovereignClass = {
  id: string;
  classKey: string;
  displayName: string;
  tier: string;
  policy: { allowedRegions: string[]; blockedRegions: string[]; promotionRequiresApproval: boolean; keyMaterialPosture: string };
};
type Assignment = { id: string; tenantId: string; classKey: string; status: string; createdAt: string };
type ExportEval = {
  id: string;
  tenantId: string;
  controlType: string;
  destinationRegion: string;
  evaluation: { decision: string; reasons: string[] };
  createdAt: string;
};
type Promotion = { id: string; tenantId: string; fromEnvironment: string; toEnvironment: string; status: string; createdAt: string };

const TIER_COLORS: Record<string, string> = {
  commercial: "#0369a1",
  regulated_enterprise: "#b45309",
  sovereign_dedicated: "#7c3aed",
  air_gapped: "#b91c1c"
};

const DECISION_COLORS: Record<string, string> = {
  allow: "#15803d",
  review_required: "#b45309",
  deny: "#b91c1c"
};

export default async function SovereignDashboard() {
  const [classes, assignments, evals, pending] = await Promise.all([
    publicGet<SovereignClass[]>("/api/sovereign/classes"),
    publicGet<Assignment[]>("/api/sovereign/assignments"),
    publicGet<ExportEval[]>("/api/sovereign/export-controls/evaluations?limit=10"),
    publicGet<Promotion[]>("/api/sovereign/promotions/pending")
  ]);

  if (classes === null) {
    return <p>Wave 9 sovereign-deployment-service unreachable.</p>;
  }

  const denials = (evals || []).filter((e) => e.evaluation.decision !== "allow").length;

  return (
    <section>
      <h1 style={{ marginTop: 0, marginBottom: 4 }}>Sovereign Control Dashboard</h1>
      <p style={{ color: "#64748b", marginTop: 0 }}>
        Sovereign classes, tenant assignments, export controls, and promotion approvals. Wave 9 surfaces.
      </p>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 14,
        marginTop: 24
      }}>
        <div style={{ padding: 18, background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.6 }}>Sovereign Classes</div>
          <div style={{ fontSize: 28, fontWeight: 600, marginTop: 4 }}>{classes.length}</div>
        </div>
        <div style={{ padding: 18, background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.6 }}>Tenant Assignments</div>
          <div style={{ fontSize: 28, fontWeight: 600, marginTop: 4 }}>{(assignments || []).filter((a) => a.status === "active").length}</div>
        </div>
        <div style={{ padding: 18, background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.6 }}>Recent Export Denials</div>
          <div style={{ fontSize: 28, fontWeight: 600, marginTop: 4, color: denials > 0 ? "#b91c1c" : "#0f172a" }}>{denials}</div>
        </div>
        <div style={{ padding: 18, background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.6 }}>Pending Promotions</div>
          <div style={{ fontSize: 28, fontWeight: 600, marginTop: 4 }}>{(pending || []).length}</div>
        </div>
      </div>

      <h2 style={{ marginTop: 36, fontSize: 18 }}>Sovereign Classes</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>
            <th style={{ padding: 10 }}>class</th>
            <th style={{ padding: 10 }}>tier</th>
            <th style={{ padding: 10 }}>allowed regions</th>
            <th style={{ padding: 10 }}>blocked regions</th>
            <th style={{ padding: 10 }}>key posture</th>
            <th style={{ padding: 10 }}>approval</th>
          </tr>
        </thead>
        <tbody>
          {classes.map((c) => (
            <tr key={c.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: 10, fontWeight: 600 }}>{c.displayName}</td>
              <td style={{ padding: 10 }}>
                <span style={{ color: TIER_COLORS[c.tier], fontWeight: 600, fontSize: 12 }}>{c.tier}</span>
              </td>
              <td style={{ padding: 10, fontSize: 12, fontFamily: "monospace" }}>{c.policy.allowedRegions.join(", ") || "—"}</td>
              <td style={{ padding: 10, fontSize: 12, fontFamily: "monospace", color: "#b91c1c" }}>{c.policy.blockedRegions.join(", ") || "—"}</td>
              <td style={{ padding: 10, fontSize: 12, fontWeight: 600 }}>{c.policy.keyMaterialPosture}</td>
              <td style={{ padding: 10, fontSize: 12 }}>{c.policy.promotionRequiresApproval ? "required" : "auto"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ marginTop: 36, fontSize: 18 }}>Recent Export Evaluations</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>
            <th style={{ padding: 10 }}>tenant</th>
            <th style={{ padding: 10 }}>control</th>
            <th style={{ padding: 10 }}>destination</th>
            <th style={{ padding: 10 }}>decision</th>
            <th style={{ padding: 10 }}>reason</th>
          </tr>
        </thead>
        <tbody>
          {(evals || []).slice(0, 10).map((e) => (
            <tr key={e.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: 10, fontFamily: "monospace", fontSize: 11 }}>{e.tenantId.slice(0, 12)}…</td>
              <td style={{ padding: 10 }}>{e.controlType}</td>
              <td style={{ padding: 10, fontWeight: 600 }}>{e.destinationRegion}</td>
              <td style={{ padding: 10, color: DECISION_COLORS[e.evaluation.decision], fontWeight: 600, fontSize: 12 }}>
                {e.evaluation.decision}
              </td>
              <td style={{ padding: 10, fontSize: 12, color: "#64748b" }}>{e.evaluation.reasons[0] || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
