import type { ReactNode } from "react";
import Link from "next/link";
import "@crownx-jewel/shared-design/theme.css";
import { AppShell } from "@crownx-jewel/shared-design";
import { AuthAction } from "./_components/AuthAction";

export const metadata = {
  title: "CrownX Vault — Own the moment. Earn from it forever.",
  description:
    "Your graded, chain-anchored collector vault. Living slabs, royalties for life, and /LV99 status."
};

const NAV = [
  { href: "/feed", label: "Feed" },
  { href: "/wealth", label: "Wealth" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/mint", label: "Mint" },
  { href: "/coa", label: "COA 3D/AR" },
  { href: "/data", label: "Data Dividend" },
  { href: "/portfolio", label: "Vault" },
  { href: "/notifications", label: "Activity" },
  { href: "/athletes", label: "Exchange" },
  { href: "/trade", label: "Pack-N-Ship" },
  { href: "/appraiser", label: "Appraiser" },
  { href: "/status", label: "/LV99" },
  { href: "/rights", label: "Rights" },
  { href: "/pricing", label: "Pricing" },
  { href: "/terms", label: "Terms" }
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="cx-app">
        <AppShell
          brandSub="Vault"
          nav={NAV}
          LinkComponent={Link}
          actions={<AuthAction />}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
