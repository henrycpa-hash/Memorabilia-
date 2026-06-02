import { authedGet } from "../../lib/api";

type Dispute = {
  id: string;
  settlementId: string;
  openedByUserId: string;
  disputeType: string;
  status: string;
  reason: string;
  resolutionType: string | null;
  createdAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  open: "#fb7185",
  in_review: "#facc15",
  waiting_on_parties: "#a78bfa",
  resolved_release: "#4ade80",
  resolved_refund: "#4ade80",
  resolved_split: "#4ade80",
  closed: "#7d83a3"
};

export default async function DisputesPage() {
  const disputes = await authedGet<Dispute[]>("/api/ops/disputes");

  if (disputes === null) {
    return (
      <section>
        <h1>Disputes</h1>
        <p style={{ color: "#a4adcb" }}>Operator sign-in required.</p>
      </section>
    );
  }

  return (
    <section>
      <h1 style={{ margin: 0 }}>Disputes</h1>
      <p style={{ color: "#a4adcb", marginTop: 6 }}>
        6 dispute types: item_not_as_described · authenticity_challenge ·
        shipping_damage · payment_issue · seller_non_performance ·
        buyer_non_performance.
      </p>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginTop: 20,
          fontSize: 14
        }}
      >
        <thead>
          <tr style={{ textAlign: "left", color: "#7d83a3" }}>
            <th style={{ padding: 10 }}>id</th>
            <th style={{ padding: 10 }}>settlement</th>
            <th style={{ padding: 10 }}>type</th>
            <th style={{ padding: 10 }}>status</th>
            <th style={{ padding: 10 }}>resolution</th>
            <th style={{ padding: 10 }}>opened</th>
            <th style={{ padding: 10 }}>reason</th>
          </tr>
        </thead>
        <tbody>
          {disputes.map((d) => (
            <tr key={d.id} style={{ borderTop: "1px solid #1f2433" }}>
              <td style={{ padding: 10, fontFamily: "monospace", fontSize: 12 }}>
                {d.id.slice(0, 10)}…
              </td>
              <td style={{ padding: 10, fontFamily: "monospace", fontSize: 12 }}>
                {d.settlementId.slice(0, 10)}…
              </td>
              <td style={{ padding: 10 }}>{d.disputeType}</td>
              <td style={{ padding: 10 }}>
                <span style={{ color: STATUS_COLORS[d.status] || "#cdd2ec" }}>
                  {d.status}
                </span>
              </td>
              <td style={{ padding: 10, color: "#a4adcb" }}>
                {d.resolutionType || "—"}
              </td>
              <td style={{ padding: 10, color: "#7d83a3", fontSize: 12 }}>
                {new Date(d.createdAt).toLocaleString()}
              </td>
              <td style={{ padding: 10, color: "#a4adcb", fontSize: 12 }}>
                {d.reason}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {disputes.length === 0 ? (
        <p style={{ color: "#7d83a3", marginTop: 24 }}>No disputes open.</p>
      ) : null}
    </section>
  );
}
