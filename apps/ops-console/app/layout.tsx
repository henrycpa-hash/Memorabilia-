import Link from "next/link";
import type { ReactNode } from "react";

export const metadata = {
  title: "CrownX Jewel — Ops Console",
  description: "Operator console for settlements, disputes, fraud, and growth"
};

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/settlements", label: "Settlements" },
  { href: "/disputes", label: "Disputes" },
  { href: "/fraud", label: "Fraud" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/analytics", label: "Analytics" }
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          background: "#0a0d18",
          color: "#e5e9f4",
          minHeight: "100vh"
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            padding: "16px 24px",
            borderBottom: "1px solid #1f2433",
            background: "#0d1120"
          }}
        >
          <strong style={{ color: "#3a86ff", fontSize: 18 }}>
            CrownX Jewel — Ops
          </strong>
          <nav style={{ display: "flex", gap: 16 }}>
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  color: "#cdd2ec",
                  textDecoration: "none",
                  fontSize: 14
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main style={{ padding: "32px 24px", maxWidth: 1200, margin: "0 auto" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
