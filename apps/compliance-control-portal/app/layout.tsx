import type { ReactNode } from "react";

export const metadata = {
  title: "CrownX Jewel — Compliance Control",
  description: "Policy packs, evaluations, NIL/league/school controls"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          background: "#fefce8",
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
            borderBottom: "2px solid #facc15",
            background: "#ffffff"
          }}
        >
          <strong style={{ color: "#854d0e", fontSize: 18 }}>CrownX Jewel · Compliance</strong>
          <span style={{ fontSize: 12, color: "#a16207" }}>
            NIL · School · League · Territory · Tenant policy packs
          </span>
        </header>
        <main style={{ padding: "32px 28px", maxWidth: 1200, margin: "0 auto" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
