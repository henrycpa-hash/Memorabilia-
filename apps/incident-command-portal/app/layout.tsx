import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "CrownX Jewel — Incident Command",
  description: "Sovereignty-class incident classification, runbook orchestration, and postmortem coordination"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif", background: "#0f172a", color: "#e2e8f0" }}>
        <header style={{ background: "#1e293b", color: "#f8fafc", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #334155" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <strong style={{ color: "#fca5a5" }}>⚡ Incident Command</strong>
            <nav style={{ display: "flex", gap: 16, fontSize: 14 }}>
              <Link href="/" style={{ color: "#94a3b8", textDecoration: "none" }}>Dashboard</Link>
              <Link href="/incidents" style={{ color: "#94a3b8", textDecoration: "none" }}>Incidents</Link>
              <Link href="/runbooks" style={{ color: "#94a3b8", textDecoration: "none" }}>Runbooks</Link>
            </nav>
          </div>
          <span style={{ fontSize: 12, color: "#64748b" }}>Wave 11 — sovereignty-class orchestration</span>
        </header>
        <main style={{ padding: "32px", maxWidth: 1280, margin: "0 auto" }}>{children}</main>
      </body>
    </html>
  );
}
