import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "CrownX Jewel — Legal Collaboration",
  description: "Collaborative redlining workspaces, clause positions, checkpoint approvals, legal escalations"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif", background: "#f8f7f5", color: "#1f2937" }}>
        <header style={{ background: "#1c2541", color: "#f9fafb", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <strong>CrownX Jewel — Legal Collaboration</strong>
            <nav style={{ display: "flex", gap: 16, fontSize: 14 }}>
              <Link href="/" style={{ color: "#cbd5f5", textDecoration: "none" }}>Dashboard</Link>
              <Link href="/workspaces" style={{ color: "#cbd5f5", textDecoration: "none" }}>Workspaces</Link>
              <Link href="/escalations" style={{ color: "#cbd5f5", textDecoration: "none" }}>Escalations</Link>
            </nav>
          </div>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>Wave 10</span>
        </header>
        <main style={{ padding: "32px", maxWidth: 1200, margin: "0 auto" }}>{children}</main>
      </body>
    </html>
  );
}
