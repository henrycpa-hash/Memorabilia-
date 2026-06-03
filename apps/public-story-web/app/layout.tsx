import type { ReactNode } from "react";
import Link from "next/link";
import "@crownx-jewel/shared-design/theme.css";
import { AppShell, ButtonLink } from "@crownx-jewel/shared-design";

export const metadata = {
  title: "CrownX — Authenticated provenance for every collectible.",
  description: "Every CrownX slab carries a Genesis COA and a story. Own the moment. Earn from it forever."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="cx-app">
        <AppShell
          brandSub="Stories"
          maxWidth={1100}
          LinkComponent={Link}
          nav={[
            { href: "/vault", label: "The Protocol" },
            { href: "/how-it-works", label: "How It Works" },
            { href: "/royalties", label: "Royalties" },
            { href: "/creators", label: "Creators" },
            { href: "/collectors", label: "Collectors" },
            { href: "/trust", label: "Trust" }
          ]}
          actions={
            <ButtonLink href="/welcome" as={Link} variant="primary" style={{ padding: "9px 16px", fontSize: 13 }}>
              Join waitlist
            </ButtonLink>
          }
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
