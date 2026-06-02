import { publicGet } from "../lib/api";

type Pack = {
  id: string;
  policyType: string;
  name: string;
  version: string;
  status: string;
  rules: Array<{ ruleKey: string; description: string }>;
  createdAt: string;
};

type Evaluation = {
  id: string;
  policyPackId: string;
  result: "approve" | "approve_with_conditions" | "reject" | "review";
  reasons: string[];
  matchedRules: string[];
  conditions: string[];
  subject: { subjectType: string; subjectId: string };
  createdAt: string;
};

const RESULT_COLORS: Record<string, string> = {
  approve: "#15803d",
  approve_with_conditions: "#a16207",
  review: "#7c3aed",
  reject: "#b91c1c"
};

export default async function CompliancePage() {
  const [packs, evals] = await Promise.all([
    publicGet<Pack[]>("/api/policies/packs"),
    publicGet<Evaluation[]>("/api/policies/evaluations")
  ]);

  if (packs === null) {
    return (
      <section>
        <h1 style={{ marginTop: 0 }}>Compliance Control</h1>
        <p>policy-compliance-service is unreachable.</p>
      </section>
    );
  }

  const recentEvals = (evals || []).slice(0, 30);

  const verdictCounts = recentEvals.reduce<Record<string, number>>((acc, e) => {
    acc[e.result] = (acc[e.result] || 0) + 1;
    return acc;
  }, {});

  return (
    <section>
      <h1 style={{ marginTop: 0, marginBottom: 4 }}>Compliance Control</h1>
      <p style={{ color: "#475569", marginTop: 0 }}>
        Policy packs (NIL / school / league / territory / tenant) and the live
        feed of evaluations they produce. Wave 6 evaluator covers prohibited
        terms, territory gates, age gates, reward caps, and rights-window
        conditions.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginTop: 24 }}>
        {(["approve", "approve_with_conditions", "review", "reject"] as const).map((k) => (
          <div
            key={k}
            style={{
              padding: 18,
              background: "#ffffff",
              border: "1px solid #e7e5e4",
              borderRadius: 10
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: "#78716c",
                textTransform: "uppercase",
                letterSpacing: 0.6
              }}
            >
              {k.replace(/_/g, " ")}
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 600,
                color: RESULT_COLORS[k],
                marginTop: 6
              }}
            >
              {verdictCounts[k] || 0}
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: 36, fontSize: 18 }}>Active policy packs</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "#78716c", borderBottom: "1px solid #e7e5e4" }}>
            <th style={{ padding: 10 }}>name</th>
            <th style={{ padding: 10 }}>type</th>
            <th style={{ padding: 10 }}>version</th>
            <th style={{ padding: 10 }}>status</th>
            <th style={{ padding: 10 }}>rules</th>
          </tr>
        </thead>
        <tbody>
          {packs.map((p) => (
            <tr key={p.id} style={{ borderBottom: "1px solid #f5f5f4" }}>
              <td style={{ padding: 10 }}>{p.name}</td>
              <td style={{ padding: 10, color: "#a16207" }}>{p.policyType}</td>
              <td style={{ padding: 10 }}>{p.version}</td>
              <td style={{ padding: 10 }}>{p.status}</td>
              <td style={{ padding: 10 }}>{p.rules?.length ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ marginTop: 32, fontSize: 18 }}>Recent evaluations</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "#78716c", borderBottom: "1px solid #e7e5e4" }}>
            <th style={{ padding: 10 }}>verdict</th>
            <th style={{ padding: 10 }}>subject</th>
            <th style={{ padding: 10 }}>reasons</th>
            <th style={{ padding: 10 }}>conditions</th>
            <th style={{ padding: 10 }}>at</th>
          </tr>
        </thead>
        <tbody>
          {recentEvals.map((e) => (
            <tr key={e.id} style={{ borderBottom: "1px solid #f5f5f4" }}>
              <td
                style={{
                  padding: 10,
                  color: RESULT_COLORS[e.result],
                  fontWeight: 600
                }}
              >
                {e.result}
              </td>
              <td style={{ padding: 10, fontFamily: "monospace", fontSize: 12 }}>
                {e.subject.subjectType}/{e.subject.subjectId.slice(0, 10)}…
              </td>
              <td style={{ padding: 10, color: "#a16207", fontSize: 12 }}>
                {e.reasons.join(", ") || "—"}
              </td>
              <td style={{ padding: 10, color: "#7c3aed", fontSize: 12 }}>
                {e.conditions.join(", ") || "—"}
              </td>
              <td style={{ padding: 10, color: "#78716c", fontSize: 12 }}>
                {new Date(e.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {recentEvals.length === 0 ? (
        <p style={{ color: "#78716c", marginTop: 16 }}>No evaluations yet — run one via /api/policies/evaluate.</p>
      ) : null}
    </section>
  );
}
