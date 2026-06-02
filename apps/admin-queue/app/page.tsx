import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ padding: 24, maxWidth: 920, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>CrownX Jewel — Admin Queue</h1>
      <p style={{ color: "#475467", marginBottom: 24 }}>
        Wave 1 reviewer console. Approve authentication cases and review COA records.
      </p>
      <nav style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/auth-cases">Authentication Cases</Link>
        <Link href="/coa">COA Records</Link>
      </nav>
    </main>
  );
}
