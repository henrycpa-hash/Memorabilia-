import { publicGet } from "../../lib/api";

type SovereignClass = {
  id: string;
  classKey: string;
  displayName: string;
  tier: string;
  policy: {
    allowedRegions: string[];
    blockedRegions: string[];
    crossRegionRoutingAllowed: boolean;
    promotionRequiresApproval: boolean;
    keyMaterialPosture: string;
    notes?: string;
  };
  createdAt: string;
};

export default async function ClassesPage() {
  const classes = await publicGet<SovereignClass[]>("/api/sovereign/classes") || [];
  return (
    <section>
      <h1 style={{ marginTop: 0 }}>Sovereign Classes ({classes.length})</h1>
      <p style={{ color: "#64748b" }}>Each class binds tenants to a region policy, key-material posture, and promotion-approval rule.</p>
      {classes.map((c) => (
        <div key={c.id} style={{
          padding: 20,
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 10,
          marginTop: 16
        }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>{c.displayName}</h3>
            <span style={{ fontFamily: "monospace", fontSize: 12, color: "#64748b" }}>{c.classKey}</span>
            <span style={{ marginLeft: "auto", fontSize: 12, color: "#1e3a8a", fontWeight: 600, textTransform: "uppercase" }}>{c.tier}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginTop: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4 }}>Allowed regions</div>
              <div style={{ fontFamily: "monospace", fontSize: 13 }}>{c.policy.allowedRegions.join(", ") || "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4 }}>Blocked regions</div>
              <div style={{ fontFamily: "monospace", fontSize: 13, color: "#b91c1c" }}>{c.policy.blockedRegions.join(", ") || "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4 }}>Cross-region routing</div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{c.policy.crossRegionRoutingAllowed ? "permitted" : "blocked"}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4 }}>Key posture</div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{c.policy.keyMaterialPosture}</div>
            </div>
          </div>
          {c.policy.notes && (
            <p style={{ marginTop: 14, fontSize: 13, color: "#475569", fontStyle: "italic" }}>{c.policy.notes}</p>
          )}
        </div>
      ))}
    </section>
  );
}
