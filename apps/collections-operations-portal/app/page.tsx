import { publicGet } from "../lib/api";

type Receivable = {
  id: string;
  tenantId: string;
  amountDueCents: number;
  amountPaidCents: number;
  dueDate: string;
  status: string;
  agingBucket: string;
  daysPastDue: number;
};

type DunningRun = { id: string; receivableId: string; cadenceStep: number; templateKey: string; channel: string; status: string; createdAt: string };
type WriteOff = { id: string; receivableId: string; amountCents: number; reason: string; status: string; createdAt: string };

const STATUS_COLORS: Record<string, string> = {
  open: "#0369a1",
  in_dunning: "#b45309",
  promise_to_pay: "#7c3aed",
  paid: "#15803d",
  written_off: "#475569",
  disputed: "#b91c1c"
};

const BUCKET_COLORS: Record<string, string> = {
  current: "#15803d",
  "1_30": "#65a30d",
  "31_60": "#ca8a04",
  "61_90": "#b45309",
  over_90: "#b91c1c"
};

function StatusChip({ value }: { value: string }) {
  return (
    <span style={{
      color: STATUS_COLORS[value] || "#64748b",
      fontWeight: 600,
      fontSize: 12
    }}>
      {value}
    </span>
  );
}

export default async function CollectionsDashboard() {
  const [receivables, runs, writeoffs] = await Promise.all([
    publicGet<Receivable[]>("/api/collections/receivables"),
    publicGet<DunningRun[]>("/api/collections/dunning/runs"),
    publicGet<WriteOff[]>("/api/collections/writeoffs")
  ]);

  if (receivables === null) {
    return <p>Wave 8 collections-dunning-service unreachable.</p>;
  }

  // Aggregates
  const buckets: Record<string, { count: number; cents: number }> = {
    current: { count: 0, cents: 0 },
    "1_30": { count: 0, cents: 0 },
    "31_60": { count: 0, cents: 0 },
    "61_90": { count: 0, cents: 0 },
    over_90: { count: 0, cents: 0 }
  };
  let totalOpen = 0;
  let totalReceivables = receivables.length;
  for (const r of receivables) {
    const remaining = r.amountDueCents - r.amountPaidCents;
    if (r.status !== "paid" && r.status !== "written_off") {
      const b = buckets[r.agingBucket];
      if (b) { b.count += 1; b.cents += remaining; }
      totalOpen += remaining;
    }
  }

  return (
    <section>
      <h1 style={{ marginTop: 0, marginBottom: 4 }}>Collections Dashboard</h1>
      <p style={{ color: "#78716c", marginTop: 0 }}>
        Receivables aging, dunning activity, and write-off pipeline. Wave 8 surfaces.
      </p>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 14,
        marginTop: 24
      }}>
        <div style={{ padding: 18, background: "#ffffff", border: "1px solid #e7e5e4", borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: "#78716c", textTransform: "uppercase", letterSpacing: 0.6 }}>Total Receivables</div>
          <div style={{ fontSize: 28, fontWeight: 600, marginTop: 4 }}>{totalReceivables}</div>
        </div>
        <div style={{ padding: 18, background: "#ffffff", border: "1px solid #e7e5e4", borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: "#78716c", textTransform: "uppercase", letterSpacing: 0.6 }}>Total Open</div>
          <div style={{ fontSize: 28, fontWeight: 600, marginTop: 4 }}>${(totalOpen / 100).toLocaleString()}</div>
        </div>
        <div style={{ padding: 18, background: "#ffffff", border: "1px solid #e7e5e4", borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: "#78716c", textTransform: "uppercase", letterSpacing: 0.6 }}>Dunning Runs</div>
          <div style={{ fontSize: 28, fontWeight: 600, marginTop: 4 }}>{runs?.length ?? 0}</div>
        </div>
        <div style={{ padding: 18, background: "#ffffff", border: "1px solid #e7e5e4", borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: "#78716c", textTransform: "uppercase", letterSpacing: 0.6 }}>Write-Offs</div>
          <div style={{ fontSize: 28, fontWeight: 600, marginTop: 4 }}>{writeoffs?.length ?? 0}</div>
        </div>
      </div>

      <h2 style={{ marginTop: 36, fontSize: 18 }}>Aging Buckets</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        {Object.entries(buckets).map(([key, val]) => (
          <div key={key} style={{
            padding: 16,
            background: "#ffffff",
            border: `2px solid ${BUCKET_COLORS[key] || "#e7e5e4"}`,
            borderRadius: 10
          }}>
            <div style={{ fontSize: 11, color: BUCKET_COLORS[key], fontWeight: 600, textTransform: "uppercase" }}>{key.replace("_", "-")}</div>
            <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4 }}>{val.count}</div>
            <div style={{ fontSize: 13, color: "#78716c", marginTop: 2 }}>${(val.cents / 100).toLocaleString()}</div>
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: 36, fontSize: 18 }}>Recent Receivables</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "#78716c", borderBottom: "1px solid #e7e5e4" }}>
            <th style={{ padding: 10 }}>tenant</th>
            <th style={{ padding: 10 }}>amount</th>
            <th style={{ padding: 10 }}>paid</th>
            <th style={{ padding: 10 }}>due</th>
            <th style={{ padding: 10 }}>past due</th>
            <th style={{ padding: 10 }}>bucket</th>
            <th style={{ padding: 10 }}>status</th>
          </tr>
        </thead>
        <tbody>
          {receivables.slice(0, 15).map((r) => (
            <tr key={r.id} style={{ borderBottom: "1px solid #f5f5f4" }}>
              <td style={{ padding: 10, fontFamily: "monospace", fontSize: 12 }}>{r.tenantId.slice(0, 12)}…</td>
              <td style={{ padding: 10, fontWeight: 600 }}>${(r.amountDueCents / 100).toFixed(2)}</td>
              <td style={{ padding: 10, color: "#15803d" }}>${(r.amountPaidCents / 100).toFixed(2)}</td>
              <td style={{ padding: 10, fontSize: 12 }}>{new Date(r.dueDate).toLocaleDateString()}</td>
              <td style={{ padding: 10, fontFamily: "monospace", fontSize: 12 }}>{r.daysPastDue > 0 ? `${r.daysPastDue}d` : "—"}</td>
              <td style={{ padding: 10, color: BUCKET_COLORS[r.agingBucket] || "#78716c", fontWeight: 600, fontSize: 12 }}>{r.agingBucket}</td>
              <td style={{ padding: 10 }}><StatusChip value={r.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
