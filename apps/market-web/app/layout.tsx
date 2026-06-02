import type { ReactNode } from "react";
import Link from "next/link";
import "@crownx-jewel/shared-design/theme.css";
import { AppShell } from "@crownx-jewel/shared-design";

export const metadata = {
  title: "CrownX Market — Live floors, every slab.",
  description: "The CrownX secondary market: listings, auctions, and watchlists with live floors."
};

const NAV = [
  { href: "/listings", label: "Listings" },
  { href: "/auctions", label: "Auctions" },
  { href: "/watchlist", label: "Watchlist" }
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="cx-app">
        <AppShell brandSub="Market" nav={NAV} maxWidth={1080} LinkComponent={Link}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
