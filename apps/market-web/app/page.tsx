import Link from "next/link";
import { publicGet } from "../lib/api";

type Ranking = {
  assetId: string;
  trendingScore: string;
  watchlistCount: number;
  saleCount: number;
};

export default async function HomePage() {
  const trending = await publicGet<Ranking[]>("/api/trending/assets?limit=10");

  return (
    <section>
      <h1 style={{ fontSize: 36, marginBottom: 12 }}>The CrownX market.</h1>
      <p style={{ color: "#a4adcb", maxWidth: 640 }}>
        Buy authenticated collectibles outright, place bids in live auctions, or watch
        what&apos;s heating up. Every transaction is provenance-anchored and royalty-aware.
      </p>

      <div style={{ display: "flex", gap: 16, marginTop: 24 }}>
        <Link href="/listings" style={btn}>Browse listings</Link>
        <Link href="/auctions" style={btn}>See live auctions</Link>
        <Link href="/watchlist" style={btnGhost}>My watchlist</Link>
      </div>

      <h2 style={{ marginTop: 48, fontSize: 18, color: "#a4adcb", textTransform: "uppercase", letterSpacing: 1 }}>
        Trending now
      </h2>
      {trending && trending.length > 0 ? (
        <ul style={{ padding: 0, listStyle: "none", marginTop: 12 }}>
          {trending.map((r) => (
            <li key={r.assetId} style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <code style={{ color: "#cdd2ec" }}>{r.assetId.slice(0, 16)}…</code>
                <span style={{ color: "#7eebc1", fontWeight: 600 }}>
                  Score: {r.trendingScore}
                </span>
              </div>
              <div style={{ color: "#7d83a3", fontSize: 12, marginTop: 4 }}>
                {r.watchlistCount} watchers · {r.saleCount} sales
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ color: "#7d83a3", marginTop: 12 }}>
          No ranking data yet. Visit a story page or place a bid to start the trending engine.
        </p>
      )}
    </section>
  );
}

const btn: React.CSSProperties = {
  background: "#3a86ff",
  color: "white",
  padding: "10px 16px",
  borderRadius: 8,
  textDecoration: "none",
  fontWeight: 600
};
const btnGhost: React.CSSProperties = {
  background: "transparent",
  color: "#a4adcb",
  border: "1px solid #2b3148",
  padding: "10px 16px",
  borderRadius: 8,
  textDecoration: "none"
};
const card: React.CSSProperties = {
  padding: 14,
  background: "#11141f",
  border: "1px solid #1f2433",
  borderRadius: 10,
  marginBottom: 8
};
