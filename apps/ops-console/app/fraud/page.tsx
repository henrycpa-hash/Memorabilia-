import { authedGet } from "../../lib/api";

type Alert = {
  id: string;
  subjectType: string;
  subjectId: string;
  alertType: string;
  severity: "info" | "warning" | "critical";
  status: string;
  reason: string;
  createdAt: string;
};

type Score = {
  id: string;
  subjectType: string;
  subjectId: string;
  score: number;
  riskBand: string;
  reasons: string[];
  createdAt: string;
};

const SEVERITY_COLORS: Record<string, string> = {
  info: "#a4adcb",
  warning: "#facc15",
  critical: "#fb7185"
};

export default async function FraudPage() {
  const [alerts, scores] = await Promise.all([
    authedGet<Alert[]>("/api/fraud/alerts"),
    authedGet<Score[]>("/api/fraud/scores")
  ]);

  if (alerts === null) {
    return (
      <section>
        <h1>Fraud</h1>
        <p style={{ color: "#a4adcb" }}>Operator sign-in required.</p>
      </section>
    );
  }

  return (
    <section>
      <h1 style={{ margin: 0 }}>Fraud & Risk</h1>
      <p style={{ color: "#a4adcb", marginTop: 6 }}>
        Risk bands: low &lt;20 · moderate ≥20 · high ≥40 · critical ≥60.
        Settlements scoring high or critical auto-hold pending review.
      </p>

      <h2 style={{ marginTop: 28, fontSize: 18 }}>Open alerts</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "#7d83a3" }}>
            <th style={{ padding: 10 }}>severity</th>
            <th style={{ padding: 10 }}>subject</th>
            <th style={{ padding: 10 }}>type</th>
            <th style={{ padding: 10 }}>status</th>
            <th style={{ padding: 10 }}>reason</th>
            <th style={{ padding: 10 }}>raised</th>
          </tr>
        </thead>
        <tbody>
          {alerts.map((a) => (
            <tr key={a.id} style={{ borderTop: "1px solid #1f2433" }}>
              <td style={{ padding: 10 }}>
                <span
                  style={{
                    color: SEVERITY_COLORS[a.severity] || "#cdd2ec",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    fontSize: 12
                  }}
                >
                  {a.severity}
                </span>
              </td>
              <td style={{ padding: 10, fontFamily: "monospace", fontSize: 12 }}>
                {a.subjectType}/{a.subjectId.slice(0, 10)}…
              </td>
              <td style={{ padding: 10 }}>{a.alertType}</td>
              <td style={{ padding: 10, color: "#a4adcb" }}>{a.status}</td>
              <td style={{ padding: 10, color: "#a4adcb", fontSize: 12 }}>
                {a.reason}
              </td>
              <td style={{ padding: 10, color: "#7d83a3", fontSize: 12 }}>
                {new Date(a.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {alerts.length === 0 ? (
        <p style={{ color: "#7d83a3", marginTop: 16 }}>No open alerts. 🎉</p>
      ) : null}

      <h2 style={{ marginTop: 32, fontSize: 18 }}>Recent scores</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "#7d83a3" }}>
            <th style={{ padding: 10 }}>subject</th>
            <th style={{ padding: 10 }}>band</th>
            <th style={{ padding: 10 }}>score</th>
            <th style={{ padding: 10 }}>reasons</th>
            <th style={{ padding: 10 }}>at</th>
          </tr>
        </thead>
        <tbody>
          {(scores || []).slice(0, 50).map((s) => (
            <tr key={s.id} style={{ borderTop: "1px solid #1f2433" }}>
              <td style={{ padding: 10, fontFamily: "monospace", fontSize: 12 }}>
                {s.subjectType}/{s.subjectId.slice(0, 10)}…
              </td>
              <td style={{ padding: 10 }}>{s.riskBand}</td>
              <td style={{ padding: 10 }}>{s.score}</td>
              <td style={{ padding: 10, color: "#a4adcb", fontSize: 12 }}>
                {s.reasons.join(", ") || "(none)"}
              </td>
              <td style={{ padding: 10, color: "#7d83a3", fontSize: 12 }}>
                {new Date(s.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
