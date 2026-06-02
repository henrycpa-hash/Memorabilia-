import { publicGet } from "../lib/api";

type Provider = { id: string; tenantId: string; providerType: string; issuer: string; status: string };
type Plan = { id: string; planKey: string; displayName: string; pricingModel: string; baseFeeCents: number };
type Statement = { id: string; tenantId: string; totalCents: number; overageCents: number; status: string; periodStart: string; periodEnd: string };
type Agreement = { id: string; counterpartyName: string; agreementType: string; status: string; effectiveDate: string; expirationDate: string | null };
type Packet = { id: string; packetType: string; subjectType: string; subjectId: string; status: string; createdAt: string };
type SlaProfile = { id: string; profileName: string; tenantId: string | null; partnerId: string | null; status: string };
type SlaBreach = { id: string; profileId: string; targetKey: string; severity: string; observed: number; target: number; createdAt: string; endedAt: string | null };

const SEVERITY_COLORS: Record<string, string> = {
  info: "#64748b",
  warning: "#a16207",
  critical: "#b91c1c"
};

const STATUS_COLORS: Record<string, string> = {
  active: "#15803d",
  draft: "#64748b",
  approved: "#1e3a8a",
  expiring: "#a16207",
  expired: "#b91c1c",
  ready: "#15803d",
  delivered: "#1e3a8a",
  queued: "#64748b",
  issued: "#1e3a8a",
  paid: "#15803d"
};

function StatusChip({ value }: { value: string }) {
  return (
    <span style={{
      color: STATUS_COLORS[value] || "#475569",
      fontWeight: 600,
      fontSize: 12
    }}>
      {value}
    </span>
  );
}

export default async function ProcurementPage() {
  const [providers, plans, statements, agreements, packets, slaProfiles, slaBreaches] = await Promise.all([
    publicGet<Provider[]>("/api/sso/providers"),
    publicGet<Plan[]>("/api/billing/plans"),
    publicGet<Statement[]>("/api/billing/statements"),
    publicGet<Agreement[]>("/api/contracts/agreements"),
    publicGet<Packet[]>("/api/legal-packets"),
    publicGet<SlaProfile[]>("/api/sla/profiles"),
    publicGet<SlaBreach[]>("/api/sla/breaches/open")
  ]);

  if (providers === null && agreements === null) {
    return (
      <section>
        <h1 style={{ marginTop: 0 }}>Procurement Governance</h1>
        <p>Wave 7 services unreachable.</p>
      </section>
    );
  }

  // Readiness checklist
  const readiness = [
    { label: "SSO providers configured", count: providers?.length ?? 0, ok: (providers?.length ?? 0) > 0 },
    { label: "Billing plans available", count: plans?.length ?? 0, ok: (plans?.length ?? 0) > 0 },
    { label: "Active agreements", count: (agreements || []).filter(a => a.status === "active").length, ok: (agreements || []).some(a => a.status === "active") },
    { label: "Statements issued", count: statements?.length ?? 0, ok: (statements?.length ?? 0) > 0 },
    { label: "SLA profiles attached", count: slaProfiles?.length ?? 0, ok: (slaProfiles?.length ?? 0) > 0 },
    { label: "Legal packets prepared", count: packets?.length ?? 0, ok: (packets?.length ?? 0) > 0 }
  ];

  return (
    <section>
      <h1 style={{ marginTop: 0, marginBottom: 4 }}>Procurement Governance</h1>
      <p style={{ color: "#475569", marginTop: 0 }}>
        Enterprise readiness across SSO, billing, contract lifecycle, SLA
        observation, and legal packet assembly. Wave 7 surfaces.
      </p>

      <h2 style={{ marginTop: 32, fontSize: 18 }}>Enterprise Readiness Checklist</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {readiness.map((r) => (
          <div
            key={r.label}
            style={{
              padding: 18,
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              display: "flex",
              flexDirection: "column",
              gap: 8
            }}
          >
            <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.6 }}>
              {r.label}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 24, fontWeight: 600, color: r.ok ? "#15803d" : "#a16207" }}>
                {r.count}
              </span>
              <span style={{ fontSize: 12, color: r.ok ? "#15803d" : "#a16207" }}>
                {r.ok ? "✓ ready" : "○ pending"}
              </span>
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: 36, fontSize: 18 }}>SSO Providers</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>
            <th style={{ padding: 10 }}>tenant</th>
            <th style={{ padding: 10 }}>type</th>
            <th style={{ padding: 10 }}>issuer</th>
            <th style={{ padding: 10 }}>status</th>
          </tr>
        </thead>
        <tbody>
          {(providers || []).slice(0, 10).map((p) => (
            <tr key={p.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: 10, fontFamily: "monospace", fontSize: 12 }}>{p.tenantId.slice(0, 12)}…</td>
              <td style={{ padding: 10 }}>{p.providerType}</td>
              <td style={{ padding: 10, color: "#1e3a8a" }}>{p.issuer}</td>
              <td style={{ padding: 10 }}><StatusChip value={p.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      {(providers?.length ?? 0) === 0 ? <p style={{ color: "#64748b", marginTop: 8 }}>No providers configured yet.</p> : null}

      <h2 style={{ marginTop: 32, fontSize: 18 }}>Active Agreements</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>
            <th style={{ padding: 10 }}>counterparty</th>
            <th style={{ padding: 10 }}>type</th>
            <th style={{ padding: 10 }}>effective</th>
            <th style={{ padding: 10 }}>expires</th>
            <th style={{ padding: 10 }}>status</th>
          </tr>
        </thead>
        <tbody>
          {(agreements || []).slice(0, 10).map((a) => (
            <tr key={a.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: 10 }}>{a.counterpartyName}</td>
              <td style={{ padding: 10, color: "#1e3a8a" }}>{a.agreementType}</td>
              <td style={{ padding: 10, fontSize: 12 }}>{new Date(a.effectiveDate).toLocaleDateString()}</td>
              <td style={{ padding: 10, fontSize: 12 }}>{a.expirationDate ? new Date(a.expirationDate).toLocaleDateString() : "—"}</td>
              <td style={{ padding: 10 }}><StatusChip value={a.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ marginTop: 32, fontSize: 18 }}>Recent Legal Packets</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>
            <th style={{ padding: 10 }}>type</th>
            <th style={{ padding: 10 }}>subject</th>
            <th style={{ padding: 10 }}>status</th>
            <th style={{ padding: 10 }}>created</th>
          </tr>
        </thead>
        <tbody>
          {(packets || []).slice(0, 10).map((p) => (
            <tr key={p.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: 10, color: "#1e3a8a" }}>{p.packetType}</td>
              <td style={{ padding: 10, fontFamily: "monospace", fontSize: 12 }}>
                {p.subjectType}/{p.subjectId.slice(0, 10)}…
              </td>
              <td style={{ padding: 10 }}><StatusChip value={p.status} /></td>
              <td style={{ padding: 10, fontSize: 12, color: "#64748b" }}>
                {new Date(p.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ marginTop: 32, fontSize: 18 }}>Open SLA Breaches</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>
            <th style={{ padding: 10 }}>severity</th>
            <th style={{ padding: 10 }}>target</th>
            <th style={{ padding: 10 }}>observed</th>
            <th style={{ padding: 10 }}>vs target</th>
            <th style={{ padding: 10 }}>opened</th>
          </tr>
        </thead>
        <tbody>
          {(slaBreaches || []).slice(0, 15).map((b) => (
            <tr key={b.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: 10, color: SEVERITY_COLORS[b.severity], fontWeight: 600 }}>
                {b.severity}
              </td>
              <td style={{ padding: 10 }}>{b.targetKey}</td>
              <td style={{ padding: 10, fontFamily: "monospace", fontSize: 12 }}>{b.observed}</td>
              <td style={{ padding: 10, fontFamily: "monospace", fontSize: 12, color: "#64748b" }}>
                target {b.target}
              </td>
              <td style={{ padding: 10, fontSize: 12, color: "#64748b" }}>
                {new Date(b.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {(slaBreaches?.length ?? 0) === 0 ? <p style={{ color: "#15803d", marginTop: 8 }}>No open breaches. ✓</p> : null}

      <h2 style={{ marginTop: 32, fontSize: 18 }}>Recent Statements</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>
            <th style={{ padding: 10 }}>tenant</th>
            <th style={{ padding: 10 }}>period</th>
            <th style={{ padding: 10 }}>total</th>
            <th style={{ padding: 10 }}>overage</th>
            <th style={{ padding: 10 }}>status</th>
          </tr>
        </thead>
        <tbody>
          {(statements || []).slice(0, 10).map((s) => (
            <tr key={s.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: 10, fontFamily: "monospace", fontSize: 12 }}>{s.tenantId.slice(0, 12)}…</td>
              <td style={{ padding: 10, fontSize: 12 }}>
                {new Date(s.periodStart).toLocaleDateString()} → {new Date(s.periodEnd).toLocaleDateString()}
              </td>
              <td style={{ padding: 10, fontWeight: 600 }}>${(s.totalCents / 100).toFixed(2)}</td>
              <td style={{ padding: 10, color: "#a16207" }}>${(s.overageCents / 100).toFixed(2)}</td>
              <td style={{ padding: 10 }}><StatusChip value={s.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
