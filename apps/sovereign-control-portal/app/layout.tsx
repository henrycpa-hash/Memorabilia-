import type { ReactNode } from "react";

export const metadata = {
  title: "CrownX Jewel — Sovereign Control",
  description: "Sovereign classes, tenant assignments, export controls"
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
          <strong style={{ color: "#1e3a8a", fontSize: 18 }}>CrownX Jewel · Sovereign Control</strong>
          <nav style={{ display: "flex", gap: 16, fontSize: 14 }}>
            <a href="/" style={{ color: "#0f172a", textDecoration: "none" }}>Dashboard</a>
            <a href="/classes" style={{ color: "#0f172a", textDecoration: "none" }}>Classes</a>
            <a href="/assignments" style={{ color: "#0f172a", textDecoration: "none" }}>Assignments</a>
            <a href="/export-controls" style={{ color: "#0f172a", textDecoration: "none" }}>Export Controls</a>
          </nav>
        </header>
        <main style={{ padding: "32px 28px", maxWidth: 1280, margin: "0 auto" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
