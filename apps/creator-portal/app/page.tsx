import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ padding: 24, maxWidth: 920, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>CrownX Jewel — Creator Portal</h1>
      <p style={{ color: "#475467", marginBottom: 24 }}>
        Wave 1 control center for athlete, artist, and memorabilia originators.
      </p>
      <nav style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/assets">Assets</Link>
        <Link href="/assets/new">Register Asset</Link>
        <Link href="/listings">Create Listing</Link>
      </nav>
    </main>
  );
}
