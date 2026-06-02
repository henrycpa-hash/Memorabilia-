import { publicGet } from "../../lib/api";

type Receivable = {
  id: string;
  tenantId: string;
  statementId: string;
  amountDueCents: number;
  amountPaidCents: number;
  dueDate: string;
  status: string;
  agingBucket: string;
  daysPastDue: number;
};

export default async function ReceivablesPage() {
  const list = await publicGet<Receivable[]>("/api/collections/receivables") || [];
  return (
    <section>
      <h1 style={{ marginTop: 0 }}>All Receivables ({list.length})</h1>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, marginTop: 16 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "#78716c", borderBottom: "1px solid #e7e5e4" }}>
            <th style={{ padding: 10 }}>id</th>
            <th style={{ padding: 10 }}>tenant</th>
            <th style={{ padding: 10 }}>statement</th>
            <th style={{ padding: 10 }}>amount</th>
            <th style={{ padding: 10 }}>balance</th>
            <th style={{ padding: 10 }}>due</th>
            <th style={{ padding: 10 }}>days past</th>
            <th style={{ padding: 10 }}>bucket</th>
            <th style={{ padding: 10 }}>status</th>
          </tr>
        </thead>
        <tbody>
          {list.map((r) => (
            <tr key={r.id} style={{ borderBottom: "1px solid #f5f5f4" }}>
              <td style={{ padding: 10, fontFamily: "monospace", fontSize: 11 }}>{r.id.slice(0, 8)}</td>
              <td style={{ padding: 10, fontFamily: "monospace", fontSize: 11 }}>{r.tenantId.slice(0, 12)}</td>
              <td style={{ padding: 10, fontFamily: "monospace", fontSize: 11 }}>{r.statementId.slice(0, 10)}</td>
              <td style={{ padding: 10, fontWeight: 600 }}>${(r.amountDueCents / 100).toFixed(2)}</td>
              <td style={{ padding: 10 }}>${((r.amountDueCents - r.amountPaidCents) / 100).toFixed(2)}</td>
              <td style={{ padding: 10, fontSize: 12 }}>{new Date(r.dueDate).toLocaleDateString()}</td>
              <td style={{ padding: 10, color: r.daysPastDue > 0 ? "#b45309" : "#78716c" }}>{r.daysPastDue}</td>
              <td style={{ padding: 10, fontWeight: 600, fontSize: 12 }}>{r.agingBucket}</td>
              <td style={{ padding: 10, fontWeight: 600, fontSize: 12 }}>{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
