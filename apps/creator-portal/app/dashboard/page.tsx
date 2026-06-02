import { apiGet } from "../../lib/api";

type Creator = { id: string };
type Asset = { id: string };
type Rule = { id: string };

export default async function DashboardPage() {
  const [creators, assets, rules] = await Promise.all([
    apiGet<Creator[]>("/api/creators").catch(() => [] as Creator[]),
    apiGet<Asset[]>("/api/assets").catch(() => [] as Asset[]),
    apiGet<Rule[]>("/api/royalty-rules").catch(() => [] as Rule[])
  ]);

  return (
    <main style={{ padding: 24, maxWidth: 920, margin: "0 auto" }}>
      <h1>Creator Dashboard</h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginTop: 16
        }}
      >
        <Card label="Creators" value={creators.length} />
        <Card label="Assets" value={assets.length} />
        <Card label="Royalty Rules" value={rules.length} />
      </div>
    </main>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        background: "white",
        padding: 16,
        borderRadius: 12,
        border: "1px solid #e4e7ec"
      }}
    >
      <div style={{ color: "#475467", fontSize: 13 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 600, marginTop: 6 }}>{value}</div>
    </div>
  );
}
