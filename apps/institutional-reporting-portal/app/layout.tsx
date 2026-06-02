import Link from "next/link";
import type { ReactNode } from "react";

export const metadata = {
  title: "CrownX Jewel — Institutional Reporting",
  description: "Board-grade reporting and executive analytics"
};

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/board", label: "Board" },
  { href: "/creator", label: "Creator" },
  { href: "/risk", label: "Risk & Trust" },
  { href: "/settlement", label: "Settlement" },
  { href: "/campaign", label: "Campaign & Experiment" }
];

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
            borderBottom: "1px solid #e2e8f0",
            background: "#ffffff"
          }}
        >
          <strong style={{ color: "#1e293b", fontSize: 18 }}>
            CrownX Jewel · Institutional
          </strong>
          <nav style={{ display: "flex", gap: 18 }}>
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{ color: "#475569", textDecoration: "none", fontSize: 14 }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main style={{ padding: "32px 28px", maxWidth: 1200, margin: "0 auto" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
