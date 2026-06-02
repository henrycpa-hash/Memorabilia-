import { authedPost } from "../lib/api";

type Section = {
  key: string;
  label: string;
  metrics: Record<string, string | number>;
};

type Report = {
  id: string;
  reportType: string;
  format: string;
  generatedAt: string;
  sections: Section[];
};

export async function generateAndRender(reportType: string, title: string, blurb: string) {
  const r = await authedPost<Report>("/api/reports", { reportType, format: "json" });

  if (r === null) {
    return (
      <section>
        <h1 style={{ marginTop: 0 }}>{title}</h1>
        <p style={{ color: "#475569" }}>
          Operator sign-in required (admin role).{" "}
          <a
            href={
              (process.env.NEXT_PUBLIC_VAULT_URL || "http://localhost:3003") + "/login"
            }
            style={{ color: "#1d4ed8" }}
          >
            Sign in
          </a>
          .
        </p>
      </section>
    );
  }

  return (
    <section>
      <h1 style={{ marginTop: 0, marginBottom: 4 }}>{title}</h1>
      <p style={{ color: "#64748b", marginTop: 0 }}>{blurb}</p>

      <div style={{ marginTop: 8, color: "#94a3b8", fontSize: 12 }}>
        Report id <code>{r.id.slice(0, 12)}…</code> generated{" "}
        {new Date(r.generatedAt).toLocaleString()}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 16,
          marginTop: 24
        }}
      >
        {r.sections.map((s) => (
          <div
            key={s.key}
            style={{
              padding: 18,
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 10
            }}
          >
            <div
              style={{
                fontSize: 13,
                color: "#475569",
                textTransform: "uppercase",
                letterSpacing: 0.6,
                marginBottom: 12
              }}
            >
              {s.label}
            </div>
            <table style={{ width: "100%", fontSize: 14 }}>
              <tbody>
                {Object.entries(s.metrics).map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ padding: "6px 0", color: "#64748b" }}>{k}</td>
                    <td
                      style={{
                        padding: "6px 0",
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                        color: "#0f172a"
                      }}
                    >
                      {typeof v === "number"
                        ? Number.isInteger(v)
                          ? v.toLocaleString()
                          : Number(v).toFixed(4)
                        : String(v)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {r.sections.length === 0 ? (
        <p style={{ color: "#94a3b8", marginTop: 24 }}>
          No sections produced — make sure the warehouse has facts.
        </p>
      ) : null}
    </section>
  );
}
