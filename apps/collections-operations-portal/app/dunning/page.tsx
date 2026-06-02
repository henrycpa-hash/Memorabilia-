import { publicGet } from "../../lib/api";

type DunningRun = {
  id: string;
  receivableId: string;
  cadenceStep: number;
  templateKey: string;
  channel: string;
  status: string;
  description: string;
  createdAt: string;
};

const CHANNEL_BG: Record<string, string> = {
  email: "#e0e7ff",
  sms: "#ddd6fe",
  call_task: "#fed7aa",
  ops_escalation: "#fecaca"
};

export default async function DunningPage() {
  const runs = await publicGet<DunningRun[]>("/api/collections/dunning/runs") || [];
  return (
    <section>
      <h1 style={{ marginTop: 0 }}>Dunning Runs ({runs.length})</h1>
      <p style={{ color: "#78716c" }}>Cadence step history per receivable. The default 5-step cadence runs on schedule via the dunning-cadence-worker.</p>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, marginTop: 16 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "#78716c", borderBottom: "1px solid #e7e5e4" }}>
            <th style={{ padding: 10 }}>step</th>
            <th style={{ padding: 10 }}>receivable</th>
            <th style={{ padding: 10 }}>template</th>
            <th style={{ padding: 10 }}>channel</th>
            <th style={{ padding: 10 }}>status</th>
            <th style={{ padding: 10 }}>description</th>
            <th style={{ padding: 10 }}>at</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.id} style={{ borderBottom: "1px solid #f5f5f4" }}>
              <td style={{ padding: 10, fontWeight: 600 }}>#{r.cadenceStep}</td>
              <td style={{ padding: 10, fontFamily: "monospace", fontSize: 11 }}>{r.receivableId.slice(0, 10)}</td>
              <td style={{ padding: 10, color: "#b45309" }}>{r.templateKey}</td>
              <td style={{ padding: 10 }}>
                <span style={{
                  background: CHANNEL_BG[r.channel] || "#f5f5f4",
                  padding: "2px 8px",
                  borderRadius: 4,
                  fontSize: 12
                }}>{r.channel}</span>
              </td>
              <td style={{ padding: 10, fontWeight: 600, fontSize: 12 }}>{r.status}</td>
              <td style={{ padding: 10, fontSize: 13, color: "#78716c" }}>{r.description}</td>
              <td style={{ padding: 10, fontSize: 12, color: "#78716c" }}>{new Date(r.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
