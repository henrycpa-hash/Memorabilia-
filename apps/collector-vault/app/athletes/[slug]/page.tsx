import Link from "next/link";
import { publicGet } from "../../../lib/api";
import { SectionTag, Panel, Badge, ButtonLink, color, font } from "@crownx-jewel/shared-design";
import { AthleteChart } from "../AthleteChart";
import { FractionBuy } from "../FractionBuy";
import { ShareAthlete } from "../ShareAthlete";

type Factor = { factor: string; label: string; weight: number; score: number; contributionCents: number };
type Detail = {
  id: string; slug: string; name: string; sport: string; team: string;
  signals: Record<string, number>;
  index: { pricePerShareCents: number; marketCapCents: number; brandScore: number; dcfComponentCents: number; brandComponentCents: number; scarcityFactor: number; breakdown: Factor[] };
  priceDisplay: string; marketCapDisplay: string; change24h: number;
  sharesOutstanding: number; fractionsSold: number; fractionsAvailable: number;
  history: { priceCents: number; event?: { kind: string; tag: string; label: string; note?: string } }[];
};
type Royalty = { athleteRoyaltyCents: number; salePriceCents: number; chainTxRef: string; fromUserId: string; toUserId: string; ts: string };
type Circle = { memberCount: number; members: { userId: string; assets: number; firstJoined: string }[] };

const fmt = (c: number) => (c >= 100_000_000 ? `$${(c / 100_000_000).toFixed(2)}M` : c >= 100_000 ? `$${(c / 100_000).toFixed(1)}K` : `$${(c / 100).toFixed(2)}`);

export default async function AthleteDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = await publicGet<Detail>(`/api/athletes/${slug}`);
  if (!a) {
    return (
      <Panel glow>
        <p style={{ color: color.mut, margin: 0 }}>Athlete not found. <Link href="/athletes" style={{ color: color.cyan }}>Back to the exchange →</Link></p>
      </Panel>
    );
  }
  const [ledger, circle] = await Promise.all([
    publicGet<Royalty[]>(`/api/athletes/${a.id}/royalty-ledger`),
    publicGet<Circle>(`/api/athletes/${a.id}/legacy`)
  ]);
  const up = a.change24h >= 0;
  const maxContribution = Math.max(...a.index.breakdown.map((b) => b.contributionCents), 1);

  return (
    <div style={{ maxWidth: 980, margin: "0 auto" }}>
      <Link href="/athletes" style={{ fontFamily: font.mono, fontSize: 11, color: color.mut }}>← Athlete Exchange</Link>

      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap", marginTop: 10 }}>
        <div>
          <h1 style={{ fontFamily: font.display, fontWeight: 400, fontSize: 48, margin: 0 }}>{a.name}</h1>
          <div style={{ fontFamily: font.mono, fontSize: 11, color: color.mut, letterSpacing: "0.08em", textTransform: "uppercase" }}>{a.sport} · {a.team} · {a.sharesOutstanding.toLocaleString()} shares</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: font.display, fontSize: 44, color: color.cyanHi, lineHeight: 1 }}>{a.priceDisplay}<span style={{ fontSize: 14, color: color.mut }}> /share</span></div>
          <div style={{ fontFamily: font.mono, fontSize: 14, fontWeight: 600, color: up ? color.win : color.hot }}>{up ? "▲ +" : "▼ "}{a.change24h}% · mkt cap {a.marketCapDisplay}</div>
          <div style={{ marginTop: 8 }}>
            <ShareAthlete athleteId={a.id} name={a.name} team={a.team} priceDisplay={a.priceDisplay} brandScore={a.index.brandScore} />
          </div>
        </div>
      </div>

      {/* chart */}
      <Panel style={{ marginTop: 16 }}>
        <AthleteChart points={a.history} />
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 8, fontFamily: font.mono, fontSize: 9, color: color.mut, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          <span><b style={{ color: "#37d39a" }}>E</b> performance</span>
          <span><b style={{ color: "#b06cff" }}>N</b> news/press</span>
          <span><b style={{ color: color.goldHi }}>R</b> resale royalty</span>
          <span><b style={{ color: color.cyanHi }}>B</b> fractions bought</span>
        </div>
      </Panel>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0,1.3fr) minmax(0,1fr)", marginTop: 16 }}>
        {/* valuation breakdown */}
        <Panel>
          <SectionTag>What drives the value</SectionTag>
          <p style={{ color: color.mut, fontSize: 12, margin: "0 0 14px" }}>
            A royalty-DCF floor (contracts + sponsor smart contracts) plus a weighted brand index. Scarcity factor {a.index.scarcityFactor}×.
          </p>
          {a.index.breakdown.map((b) => (
            <div key={b.factor} style={{ marginBottom: 11 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                <span style={{ color: color.txt }}>{b.label} {b.factor !== "royaltyDcf" && <span style={{ color: color.mut2, fontFamily: font.mono, fontSize: 10 }}>· w{b.weight}</span>}</span>
                <span style={{ fontFamily: font.mono, color: b.factor === "royaltyDcf" ? color.goldHi : color.cyanHi }}>{fmt(b.contributionCents)}</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                <span style={{ display: "block", height: "100%", width: `${Math.round((b.contributionCents / maxContribution) * 100)}%`, background: b.factor === "royaltyDcf" ? `linear-gradient(90deg,${color.goldDeep},${color.goldHi})` : `linear-gradient(90deg,${color.cyanDk},${color.cyanHi})` }} />
              </div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <Badge tone="gold">DCF floor {fmt(a.index.dcfComponentCents)}</Badge>
            <Badge tone="cyan">Brand {a.index.brandScore}/100</Badge>
          </div>
        </Panel>

        {/* fractions + your stake */}
        <Panel glow>
          <FractionBuy athleteId={a.id} priceCents={a.index.pricePerShareCents} available={a.fractionsAvailable} />
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${color.line}`, fontSize: 12, color: color.mut }}>
            {a.fractionsSold.toLocaleString()} / {a.sharesOutstanding.toLocaleString()} shares held by fans. As a stakeholder you share in the athlete&apos;s rise — and earn XP.
          </div>
        </Panel>
      </div>

      {/* royalty ledger — blockchain-tracked resale royalties */}
      <Panel style={{ marginTop: 16 }}>
        <SectionTag>Resale royalties · blockchain-tracked</SectionTag>
        {(ledger || []).length === 0 ? (
          <p style={{ color: color.mut, fontSize: 13, margin: 0 }}>No resales yet. Each time this athlete&apos;s memorabilia resells, they earn a royalty — recorded on-chain through CrownX.</p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {(ledger || []).slice(0, 6).map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", border: `1px solid ${color.line}`, borderRadius: 10, background: "rgba(255,255,255,0.02)" }}>
                <div>
                  <div style={{ fontSize: 13, color: color.txt }}>Resale {fmt(r.salePriceCents)} · {r.fromUserId.slice(0, 6)}→{r.toUserId.slice(0, 6)}</div>
                  <div style={{ fontFamily: font.mono, fontSize: 9, color: color.mut2 }}>tx {r.chainTxRef.slice(0, 14)}…</div>
                </div>
                <div style={{ fontFamily: font.display, fontSize: 20, color: color.goldHi }}>+{fmt(r.athleteRoyaltyCents)}</div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Legacy Circle — the chain of owners tied to the athlete */}
      <Panel style={{ marginTop: 16 }}>
        <SectionTag>The Legacy Circle</SectionTag>
        <p style={{ color: color.mut, fontSize: 12, margin: "0 0 12px" }}>
          Each resale grants the new owner membership in {a.name}&apos;s Legacy Circle — a connected chain of supporters
          (Fan A → Fan B → …) tied directly to the athlete, with VIP access, profit-sharing, and heritage perks.
        </p>
        {circle && circle.memberCount > 0 ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {circle.members.map((m, i) => (
              <span key={m.userId} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {i > 0 && <span style={{ color: color.cyan }}>→</span>}
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, border: `1px solid ${color.line2}`, background: "rgba(63,217,212,0.06)" }}>
                  <span style={{ width: 22, height: 22, borderRadius: "50%", background: `linear-gradient(135deg,${color.cyanHi},${color.cyanDk})`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: font.mono, fontSize: 9, color: color.void }}>{m.userId.slice(0, 2).toUpperCase()}</span>
                  <span style={{ fontFamily: font.mono, fontSize: 11, color: color.txt }}>{m.userId.slice(0, 8)}</span>
                  <Badge tone="gold">{m.assets}×</Badge>
                </span>
              </span>
            ))}
          </div>
        ) : (
          <p style={{ color: color.mut2, fontSize: 12, margin: 0 }}>No members yet — the circle forms on the first resale.</p>
        )}
      </Panel>

      <div style={{ marginTop: 16, textAlign: "center" }}>
        <ButtonLink href="/athletes" as={Link} variant="secondary">← Back to the exchange</ButtonLink>
      </div>
    </div>
  );
}
