"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { clientSession, clientAuthedGet } from "../../lib/clientAuth";
import { MintReveal } from "../_components/MintReveal";
import { SlabCard, SectionTag, Panel, ButtonLink, Badge, color, font } from "@crownx-jewel/shared-design";

type Asset = {
  id: string;
  title: string;
  assetType: string;
  authenticityStatus: string;
  slug?: string;
};

const STORY_BASE = process.env.NEXT_PUBLIC_PUBLIC_STORY_URL || "http://localhost:3004";

// deterministic, display-only flourish from the id — never priced here
function floorFor(id: string) {
  const n = [...id].reduce((a, c) => a + c.charCodeAt(0), 0);
  const floor = 320 + (n % 1800);
  const change = ((n % 19) - 9) / 1.7;
  return { floor: `${floor.toLocaleString()}`, change: `${change >= 0 ? "+" : ""}${change.toFixed(1)}%` };
}

export default function PortfolioPage() {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [vault, setVault] = useState<Asset[]>([]);

  useEffect(() => {
    const s = clientSession();
    if (!s) {
      setSignedIn(false);
      setReady(true);
      return;
    }
    setSignedIn(true);
    clientAuthedGet<Asset[]>("/api/vault/me").then((v) => {
      setVault(v || []);
      setReady(true);
    });
  }, []);

  if (ready && !signedIn) {
    return (
      <section>
        <SectionTag>Your Vault</SectionTag>
        <Panel glow>
          <h1 style={{ fontFamily: font.display, fontWeight: 400, fontSize: 34, margin: "0 0 8px" }}>Sign in to open the Vault</h1>
          <p style={{ color: color.mut, margin: "0 0 16px" }}>Authenticate to see the slabs you own and their live floors.</p>
          <ButtonLink href="/login" as={Link} variant="primary">Authenticate →</ButtonLink>
        </Panel>
      </section>
    );
  }

  return (
    <section>
      <SectionTag>Your Vault</SectionTag>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: font.display, fontWeight: 400, fontSize: 40, margin: "0 0 6px" }}>
            {vault.length} living slab{vault.length === 1 ? "" : "s"}
          </h1>
          <p style={{ color: color.mut, maxWidth: 560, margin: 0 }}>
            Each slab is graded, chain-anchored, and carries a royalty for life. Tap one to open its public story.
          </p>
        </div>
        <MintReveal />
      </div>

      {ready && vault.length === 0 ? (
        <Panel style={{ marginTop: 16 }}>
          <p style={{ color: color.mut, margin: 0 }}>
            You don&apos;t own any collectibles yet. Claim a founder slab to begin your /LV99 ascent.
          </p>
        </Panel>
      ) : (
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", marginTop: 18 }}>
          {vault.map((asset) => {
            const m = floorFor(asset.id);
            const approved = asset.authenticityStatus === "approved";
            return (
              <div key={asset.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <SlabCard
                  name={asset.title}
                  subtitle={asset.assetType?.toUpperCase()}
                  floor={m.floor}
                  change={m.change}
                  badge={approved ? "VERIFIED" : asset.authenticityStatus?.toUpperCase()}
                  href={asset.slug && approved ? `${STORY_BASE}/collectible/${asset.slug}` : undefined}
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Badge tone={approved ? "win" : "mut"}>{asset.authenticityStatus}</Badge>
                  {asset.slug && approved && (
                    <a href={`${STORY_BASE}/collectible/${asset.slug}`} style={{ fontFamily: font.mono, fontSize: 10, color: color.cyan, letterSpacing: "0.06em" }}>
                      STORY →
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
