"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { SectionTag, Panel, Badge, buttonStyle, color, font } from "@crownx-jewel/shared-design";
import { FloatingSlab3D } from "./FloatingSlab3D";

const GATEWAY = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000";

function session(): { sub: string; name: string } {
  if (typeof document === "undefined") return { sub: "guest", name: "guest" };
  const m = document.cookie.match(/cx_access=([^;]+)/);
  try {
    const p = m ? JSON.parse(atob(m[1].split(".")[1])) : {};
    return { sub: p.sub || "guest", name: (p.email || "guest").split("@")[0] };
  } catch {
    return { sub: "guest", name: "guest" };
  }
}

type Comment = { id: string; userName: string; text: string };
type Post = {
  id: string; kind: "mint" | "listing" | "auction" | "athlete_news" | "promo";
  authorName: string; title: string; body?: string;
  item?: { name: string; grade?: string; floorDisplay?: string; lv?: string };
  priceCents?: number; sold?: boolean; tradeId?: string;
  auction?: { currentBidCents: number; highBidderName?: string; endsAt: string; bids: unknown[] };
  athleteName?: string; valueDelta?: string; priceDisplay?: string;
  reactions: number; boosts: number; commentsAllowed: boolean; comments: Comment[];
};

const usd = (c: number) => (c >= 100_000 ? `$${(c / 100_000).toFixed(1)}K` : `$${(c / 100).toFixed(2)}`);

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [me] = useState(session);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [flash, setFlash] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${GATEWAY}/api/feed`).then((x) => x.json());
      setPosts(Array.isArray(r) ? r : []);
    } catch {
      /* offline */
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const act = async (path: string, body: unknown, postId: string, ok: (d: Record<string, unknown>) => string) => {
    try {
      const res = await fetch(`${GATEWAY}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const d = await res.json();
      setFlash((f) => ({ ...f, [postId]: res.ok ? ok(d) : `✗ ${d.error}${d.currentBidDisplay ? ` (now ${d.currentBidDisplay})` : ""}` }));
      load();
    } catch {
      setFlash((f) => ({ ...f, [postId]: "✗ feed unavailable" }));
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <SectionTag>Network Feed</SectionTag>
      <h1 style={{ fontFamily: font.display, fontWeight: 400, fontSize: 44, margin: "0 0 4px" }}>The market, live.</h1>
      <p style={{ color: color.mut, marginTop: 0 }}>
        Mints, listings, live auctions, and tokenized-athlete news — the collectible is the content. Boost to amplify;
        buy and bid right here; comment on news &amp; promos (market items stay clean).
      </p>

      <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
        {posts.map((p) => (
          <Panel key={p.id} glow={p.kind === "mint"}>
            {/* author + kind */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#21283c,#10131f)", border: `1px solid ${color.line2}` }} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>{p.authorName}</span>
              </div>
              <Badge tone={p.kind === "athlete_news" ? "gold" : p.kind === "auction" ? "hot" : p.kind === "listing" ? "win" : "cyan"}>{p.kind.replace("_", " ")}</Badge>
            </div>

            <div style={{ fontSize: 15, fontWeight: 600, color: color.txt }}>{p.title}</div>
            {p.body && <div style={{ fontSize: 13, color: color.mut, marginTop: 4 }}>{p.body}</div>}

            {/* mint moment — 3D floating slab */}
            {p.kind === "mint" && p.item && (
              <div style={{ display: "flex", justifyContent: "center", padding: "14px 0 4px" }}>
                <FloatingSlab3D name={p.item.name} grade={p.item.grade} floor={p.item.floorDisplay} lv={p.item.lv} />
              </div>
            )}

            {/* listing — click to buy */}
            {p.kind === "listing" && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, padding: "11px 13px", border: `1px solid ${color.line}`, borderRadius: 12, background: "rgba(255,255,255,0.02)" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13 }}>{p.item?.name} · grade {p.item?.grade}</div>
                  <div style={{ fontFamily: font.display, fontSize: 24, color: color.goldHi }}>{usd(p.priceCents || 0)}</div>
                </div>
                {p.sold ? (
                  <Link href="/trade" style={{ ...buttonStyle("secondary"), fontSize: 13, textDecoration: "none" }}>Sold → Pack-N-Ship →</Link>
                ) : (
                  <button onClick={() => act(`/api/feed/${p.id}/buy`, { buyerId: me.sub }, p.id, (d) => `✓ bought → Pack-N-Ship trade ${(d.tradeId as string).slice(0, 10)}…`)} style={buttonStyle("primary")}>Buy now →</button>
                )}
              </div>
            )}

            {/* auction — live bids */}
            {p.kind === "auction" && p.auction && (
              <div style={{ marginTop: 12, padding: "11px 13px", border: `1px solid ${color.line}`, borderRadius: 12, background: "rgba(255,255,255,0.02)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontFamily: font.mono, fontSize: 10, color: color.mut, textTransform: "uppercase" }}>Current bid {p.auction.bids.length ? `· high ${p.auction.highBidderName}` : ""}</span>
                  <span style={{ fontFamily: font.display, fontSize: 24, color: color.hot }}>{usd(p.auction.currentBidCents)}</span>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <input type="number" placeholder={`> ${(p.auction.currentBidCents / 100).toFixed(0)}`} value={draft[p.id] || ""} onChange={(e) => setDraft((s) => ({ ...s, [p.id]: e.target.value }))} style={{ flex: 1, background: "rgba(255,255,255,0.05)", color: color.txt, border: `1px solid ${color.line2}`, padding: "9px 11px", borderRadius: 9, fontFamily: font.mono, fontSize: 13 }} />
                  <button onClick={() => act(`/api/feed/${p.id}/bid`, { userId: me.sub, userName: me.name, amountCents: Math.round(parseFloat(draft[p.id] || "0") * 100) }, p.id, (d) => `✓ high bid ${d.currentBidDisplay}`)} style={buttonStyle("gold")}>Place bid</button>
                </div>
              </div>
            )}

            {/* athlete news — value moved */}
            {p.kind === "athlete_news" && (
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
                <Badge tone={p.valueDelta?.startsWith("-") ? "hot" : "win"}>{p.athleteName} {p.valueDelta || ""} → {p.priceDisplay}</Badge>
                <Link href="/athletes" style={{ fontFamily: font.mono, fontSize: 11, color: color.cyan }}>Trade the athlete →</Link>
              </div>
            )}

            {/* engagement bar */}
            <div style={{ display: "flex", gap: 14, marginTop: 14, alignItems: "center", flexWrap: "wrap" }}>
              <button onClick={() => act(`/api/feed/${p.id}/boost`, { userId: me.sub }, p.id, (d) => `🚀 boosted (${d.boosts})`)} style={{ ...buttonStyle("secondary"), padding: "7px 14px", fontSize: 12 }}>🚀 Boost</button>
              <span style={{ fontFamily: font.mono, fontSize: 11, color: color.mut }}>{p.reactions} reactions · {p.boosts} boosts</span>
              {p.kind !== "athlete_news" && p.kind !== "promo" && <span style={{ fontFamily: font.mono, fontSize: 9, color: color.mut2 }}>comments off (market item)</span>}
            </div>
            {flash[p.id] && <div style={{ fontFamily: font.mono, fontSize: 11, color: flash[p.id].startsWith("✗") ? color.hot : color.win, marginTop: 8 }}>{flash[p.id]}</div>}

            {/* comments — only on news + promos */}
            {p.commentsAllowed && (
              <div style={{ marginTop: 12, borderTop: `1px solid ${color.line}`, paddingTop: 12 }}>
                {p.comments.slice(-3).map((c) => (
                  <div key={c.id} style={{ fontSize: 12.5, marginBottom: 6 }}>
                    <b style={{ color: color.cyanHi }}>{c.userName}</b> <span style={{ color: color.mut }}>{c.text}</span>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <input placeholder="Add a comment…" value={draft[`c_${p.id}`] || ""} onChange={(e) => setDraft((s) => ({ ...s, [`c_${p.id}`]: e.target.value }))} style={{ flex: 1, background: "rgba(255,255,255,0.05)", color: color.txt, border: `1px solid ${color.line2}`, padding: "8px 11px", borderRadius: 9, fontSize: 13, fontFamily: font.body }} />
                  <button onClick={() => { const t = draft[`c_${p.id}`]; if (t) { act(`/api/feed/${p.id}/comment`, { userId: me.sub, userName: me.name, text: t }, p.id, () => "✓ commented"); setDraft((s) => ({ ...s, [`c_${p.id}`]: "" })); } }} style={{ ...buttonStyle("secondary"), padding: "8px 14px", fontSize: 12 }}>Post</button>
                </div>
              </div>
            )}
          </Panel>
        ))}
        {posts.length === 0 && <Panel><p style={{ color: color.mut, margin: 0 }}>The feed is warming up — start the network-feed-service.</p></Panel>}
      </div>
    </div>
  );
}
