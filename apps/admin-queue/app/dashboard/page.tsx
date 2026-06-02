import { apiGet } from "../../lib/api";

type AuthCase = { id: string; status: string };
type Coa = { id: string };
type Order = { id: string };

export default async function DashboardPage() {
  const [authCases, coaRecords, orders] = await Promise.all([
    apiGet<AuthCase[]>("/api/auth-cases").catch(() => [] as AuthCase[]),
    apiGet<Coa[]>("/api/coa").catch(() => [] as Coa[]),
    apiGet<Order[]>("/api/orders").catch(() => [] as Order[])
  ]);

  const pending = authCases.filter((c) => c.status === "pending").length;
  const approved = authCases.filter((c) => c.status === "approved").length;

  return (
    <main style={{ padding: 24, maxWidth: 920, margin: "0 auto" }}>
      <h1>Admin Dashboard</h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginTop: 16
        }}
      >
        <Card label="Total auth cases" value={authCases.length} />
        <Card label="Pending review" value={pending} />
        <Card label="Approved" value={approved} />
        <Card label="COA records" value={coaRecords.length} />
        <Card label="Orders" value={orders.length} />
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
