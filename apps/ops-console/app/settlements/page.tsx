import { authedGet } from "../../lib/api";

type Settlement = {
  id: string;
  sourceType: string;
  sourceId: string;
  assetId: string;
  buyerId: string;
  sellerId: string;
  grossAmount: string;
  escrowState: string;
  settlementState: string;
  holdReason: string | null;
  riskBand: string | null;
  riskScore: number | null;
  createdAt: string;
};

const STATE_COLORS: Record<string, string> = {
  pending_payment: "#7d83a3",
  escrow_held: "#3a86ff",
  ready_for_release: "#3a86ff",
  on_hold: "#fb7185",
  payout_scheduled: "#a78bfa",
  completed: "#4ade80",
  refunded: "#facc15",
  failed: "#fb7185"
};

export default async function SettlementsPage() {
  const settlements = await authedGet<Settlement[]>("/api/ops/settlements");

  if (settlements === null) {
    return (
      <section>
        <h1>Settlements</h1>
        <p style={{ color: "#a4adcb" }}>Operator sign-in required.</p>
      </section>
    );
  }

  const sorted = [...settlements].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );

  return (
    <section>
      <h1 style={{ margin: 0 }}>Settlements</h1>
      <p style={{ color: "#a4adcb", marginTop: 6 }}>
        Settlement state machine: pending_payment → escrow_held → ready_for_release →
        (on_hold) → payout_scheduled → completed. Use the actions to override.
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
            <th style={{ padding: 10 }}>source</th>
            <th style={{ padding: 10 }}>amount</th>
            <th style={{ padding: 10 }}>escrow</th>
            <th style={{ padding: 10 }}>state</th>
            <th style={{ padding: 10 }}>risk</th>
            <th style={{ padding: 10 }}>hold reason</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s) => (
            <tr key={s.id} style={{ borderTop: "1px solid #1f2433" }}>
              <td style={{ padding: 10, fontFamily: "monospace", fontSize: 12 }}>
                {s.id.slice(0, 10)}…
              </td>
              <td style={{ padding: 10 }}>
                {s.sourceType}{" "}
                <span style={{ color: "#7d83a3", fontSize: 12 }}>
                  {s.sourceId.slice(0, 8)}…
                </span>
              </td>
              <td style={{ padding: 10 }}>${Number(s.grossAmount).toLocaleString()}</td>
              <td style={{ padding: 10, color: "#a4adcb" }}>{s.escrowState}</td>
              <td style={{ padding: 10 }}>
                <span
                  style={{
                    color: STATE_COLORS[s.settlementState] || "#cdd2ec",
                    fontWeight: 600
                  }}
                >
                  {s.settlementState}
                </span>
              </td>
              <td style={{ padding: 10 }}>
                {s.riskBand ? `${s.riskBand} (${s.riskScore})` : "—"}
              </td>
              <td style={{ padding: 10, color: "#fb7185", fontSize: 12 }}>
                {s.holdReason || ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {sorted.length === 0 ? (
        <p style={{ color: "#7d83a3", marginTop: 24 }}>No settlements yet.</p>
      ) : null}
    </section>
  );
}
