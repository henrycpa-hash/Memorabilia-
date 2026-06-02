import { apiGet } from "../../lib/api";

type Coa = {
  id: string;
  assetId: string;
  coaNumber: string;
  manifestHash: string;
  status: string;
};

export default async function CoaPage() {
  const coaRecords = await apiGet<Coa[]>("/api/coa").catch(() => [] as Coa[]);

  return (
    <main style={{ padding: 24, maxWidth: 920, margin: "0 auto" }}>
      <h1>COA Records</h1>
      <ul style={{ padding: 0, listStyle: "none" }}>
        {coaRecords.map((coa) => (
          <li
            key={coa.id}
            style={{
              padding: 12,
              border: "1px solid #e4e7ec",
              background: "white",
              borderRadius: 8,
              marginBottom: 8
            }}
          >
            <div style={{ fontWeight: 600 }}>{coa.coaNumber}</div>
            <div style={{ color: "#475467", fontSize: 13 }}>
              asset {coa.assetId} · status {coa.status}
            </div>
            <div
              style={{
                color: "#475467",
                fontSize: 12,
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
                marginTop: 4
              }}
            >
              hash {coa.manifestHash.slice(0, 32)}…
            </div>
          </li>
        ))}
        {coaRecords.length === 0 && (
          <li style={{ color: "#475467" }}>No COA records yet.</li>
        )}
      </ul>
    </main>
  );
}
