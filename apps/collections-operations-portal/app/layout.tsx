import type { ReactNode } from "react";

export const metadata = {
  title: "CrownX Jewel — Collections Operations",
  description: "Receivables, dunning, write-offs"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          background: "#fafaf9",
          color: "#1c1917",
          minHeight: "100vh"
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            padding: "16px 28px",
            borderBottom: "2px solid #b45309",
            background: "#ffffff"
          }}
        >
          <strong style={{ color: "#b45309", fontSize: 18 }}>CrownX Jewel · Collections Operations</strong>
          <nav style={{ display: "flex", gap: 16, fontSize: 14 }}>
            <a href="/" style={{ color: "#1c1917", textDecoration: "none" }}>Dashboard</a>
            <a href="/receivables" style={{ color: "#1c1917", textDecoration: "none" }}>Receivables</a>
            <a href="/dunning" style={{ color: "#1c1917", textDecoration: "none" }}>Dunning</a>
            <a href="/writeoffs" style={{ color: "#1c1917", textDecoration: "none" }}>Write-Offs</a>
          </nav>
        </header>
        <main style={{ padding: "32px 28px", maxWidth: 1280, margin: "0 auto" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
