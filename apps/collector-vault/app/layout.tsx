import type { ReactNode } from "react";
import Link from "next/link";
import "@crownx-jewel/shared-design/theme.css";
import { AppShell, ButtonLink } from "@crownx-jewel/shared-design";

export const metadata = {
  title: "CrownX Vault — Own the moment. Earn from it forever.",
  description:
    "Your graded, chain-anchored collector vault. Living slabs, royalties for life, and /LV99 status."
};

const NAV = [
  { href: "/wealth", label: "Wealth" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/mint", label: "Mint" },
  { href: "/portfolio", label: "Vault" },
  { href: "/notifications", label: "Activity" },
  { href: "/athletes", label: "Exchange" },
  { href: "/trade", label: "Pack-N-Ship" },
  { href: "/appraiser", label: "Appraiser" },
  { href: "/status", label: "/LV99" },
  { href: "/rights", label: "Rights" },
  { href: "/pricing", label: "Pricing" }
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="cx-app">
        <AppShell
          brandSub="Vault"
          nav={NAV}
          LinkComponent={Link}
          actions={
            <ButtonLink href="/login" as={Link} variant="primary" style={{ padding: "9px 16px", fontSize: 13 }}>
              Sign in
            </ButtonLink>
          }
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
