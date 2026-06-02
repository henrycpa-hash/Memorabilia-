import Link from "next/link";
import { publicGet } from "../../lib/api";
import { SectionTag, Panel, Badge, color, font } from "@crownx-jewel/shared-design";

type Row = {
  id: string;
  slug: string;
  name: string;
  sport: string;
  team: string;
  priceDisplay: string;
  marketCapDisplay: string;
  change24h: number;
  fractionsSold: number;
  sharesOutstanding: number;
};

export const metadata = { title: "CrownX — Athlete Exchange" };

export default async function AthletesPage() {
  const rows = (await publicGet<Row[]>("/api/athletes")) || [];

  return (
    <div style={{ maxWidth: 880, margin: "0 auto" }}>
      <SectionTag>Athlete Exchange</SectionTag>
      <h1 style={{ fontFamily: font.display, fontWeight: 400, fontSize: 44, margin: "0 0 4px" }}>Own a piece of the athlete.</h1>
      <p style={{ color: color.mut, maxWidth: 620, marginTop: 0 }}>
        Every athlete is valued live for their actions and values — on and off the field, royalties, press, and how their
        memorabilia trades. Not dreams: a hard royalty-DCF floor plus a brand index. Buy fractional shares; the athlete
        earns a tracked royalty on every resale.
      </p>

      <Panel style={{ marginTop: 16, padding: 0, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 0.8fr", padding: "10px 16px", borderBottom: `1px solid ${color.line2}`, fontFamily: font.mono, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: color.mut }}>
          <span>Athlete</span>
          <span style={{ textAlign: "right" }}>Share price</span>
          <span style={{ textAlign: "right" }}>24h</span>
          <span style={{ textAlign: "right" }}>Mkt cap</span>
        </div>
        {rows.map((r) => {
          const up = r.change24h >= 0;
          return (
            <Link key={r.id} href={`/athletes/${r.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 0.8fr", padding: "14px 16px", borderBottom: `1px solid ${color.line}`, alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.display, fontSize: 18, color: color.void, background: `linear-gradient(135deg, ${color.cyanHi}, ${color.cyanDk})` }}>
                    {r.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{r.name}</div>
                    <div style={{ fontFamily: font.mono, fontSize: 9, color: color.mut, letterSpacing: "0.06em", textTransform: "uppercase" }}>{r.sport} · {r.team}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right", fontFamily: font.display, fontSize: 22, color: color.cyanHi }}>{r.priceDisplay}</div>
                <div style={{ textAlign: "right", fontFamily: font.mono, fontSize: 13, fontWeight: 600, color: up ? color.win : color.hot }}>{up ? "▲" : "▼"} {up ? "+" : ""}{r.change24h}%</div>
                <div style={{ textAlign: "right", fontFamily: font.mono, fontSize: 12, color: color.mut }}>{r.marketCapDisplay}</div>
              </div>
            </Link>
          );
        })}
        {rows.length === 0 && <div style={{ padding: 20, color: color.mut }}>The exchange is warming up — start the athlete-index-service.</div>}
      </Panel>

      <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Badge tone="cyan">Fractional ownership</Badge>
        <Badge tone="gold">Royalties on every resale</Badge>
        <Badge tone="win">Blockchain-tracked</Badge>
        <Badge tone="mut">Dynamic valuation</Badge>
      </div>
    </div>
  );
}
