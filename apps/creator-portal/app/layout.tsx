import type { ReactNode } from "react";
import Link from "next/link";
import "@crownx-jewel/shared-design/theme.css";
import { AppShell } from "@crownx-jewel/shared-design";

export const metadata = {
  title: "CrownX — Creator Portal",
  description: "Control center for athletes, artists, and memorabilia originators."
};

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/assets", label: "Assets" },
  { href: "/listings", label: "Listings" },
  { href: "/athlete", label: "Athletes" },
  { href: "/login", label: "Sign in" }
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="cx-app">
        <AppShell brandSub="Creator" nav={NAV} maxWidth={1080} LinkComponent={Link}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
