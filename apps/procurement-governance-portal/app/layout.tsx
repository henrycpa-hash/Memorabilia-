import type { ReactNode } from "react";

export const metadata = {
  title: "CrownX Jewel — Procurement Governance",
  description: "Enterprise readiness, SSO, contracts, billing, SLA, legal packets"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          background: "#f8fafc",
          color: "#0f172a",
          minHeight: "100vh"
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            padding: "16px 28px",
            borderBottom: "2px solid #1e3a8a",
            background: "#ffffff"
          }}
        >
          <strong style={{ color: "#1e3a8a", fontSize: 18 }}>CrownX Jewel · Procurement Governance</strong>
          <span style={{ fontSize: 12, color: "#475569" }}>
            SSO · Contracts · Billing · SLA · Legal Packets
          </span>
        </header>
        <main style={{ padding: "32px 28px", maxWidth: 1280, margin: "0 auto" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
