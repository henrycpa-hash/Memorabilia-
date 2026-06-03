import Link from "next/link";
import { publicGet } from "../../../lib/api";
import { SectionTag, Panel, Badge, ButtonLink, color, font } from "@crownx-jewel/shared-design";
import { AthleteChart } from "../AthleteChart";
import { FractionBuy } from "../FractionBuy";
import { ShareAthlete } from "../ShareAthlete";
import { AthleteTools } from "../AthleteTools";
import { AppraiserPicker } from "../AppraiserPicker";
import { OrderBook } from "../OrderBook";

type Factor = { factor: string; label: string; weight: number; score: number; contributionCents: number };
type Stakeholder = { rank: number; userId: string; shares: number; valueDisplay: string };
type RoyaltyVault = { claimed: boolean; pieceCount: number; display: { held: string; claimedLifetime: string; donation: string } };
type Contract = { id: string; counterparty: string; kind: string; annualValueCents: number; termYears: number; verified: boolean };
type TimelineEvent = { id: string; kind: string; title: string; detail?: string; date: string };
type Detail = {
  id: string; slug: string; name: string; sport: string; team: string;
  signals: Record<string, number>;
  index: { pricePerShareCents: number; marketCapCents: number; brandScore: number; dcfComponentCents: number; brandComponentCents: number; scarcityFactor: number; elasticityFactor: number; breakdown: Factor[] };
  priceDisplay: string; marketCapDisplay: string; change24h: number;
  sharesOutstanding: number; fractionsSold: number; fractionsAvailable: number;
  contractsDcfCents: number; contracts: Contract[]; timeline: TimelineEvent[];
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
  const [ledger, circle, stake, vault, coaList] = await Promise.all([
    publicGet<Royalty[]>(`/api/athletes/${a.id}/royalty-ledger`),
    publicGet<Circle>(`/api/athletes/${a.id}/legacy`),
    publicGet<{ holders: Stakeholder[] }>(`/api/athletes/${a.id}/top-stakeholders`),
    publicGet<RoyaltyVault>(`/api/royalty-vault/athlete/${slug}`),
    publicGet<{ artifacts: { id: string; athleteId?: string; title: string; valuationDisplay: string }[] }>(`/api/coa-artifact?limit=48`)
  ]);
  const athleteCoa = (coaList?.artifacts || []).find((c) => c.athleteId === slug) || null;
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
            <Badge tone={a.index.elasticityFactor >= 1 ? "win" : "hot"}>Elasticity {a.index.elasticityFactor}×</Badge>
            {a.contractsDcfCents > 0 && <Badge tone="gold">Contracts {fmt(a.contractsDcfCents)}</Badge>}
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

      {/* secondary-market order book + top stakeholders */}
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0,1.2fr) minmax(0,1fr)", marginTop: 16 }}>
        <Panel>
          <OrderBook athleteId={a.id} priceCents={a.index.pricePerShareCents} />
        </Panel>
        <Panel>
          <SectionTag>Top stakeholders</SectionTag>
          <p style={{ color: color.mut, fontSize: 12, margin: "0 0 12px" }}>Fans who own the most of {a.name} — they rise with the athlete and earn XP.</p>
          {(stake?.holders || []).length === 0 ? (
            <p style={{ color: color.mut2, fontSize: 12, margin: 0 }}>No stakeholders yet — be the first to own a piece.</p>
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {(stake?.holders || []).map((h) => (
                <div key={h.userId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", border: `1px solid ${color.line}`, borderRadius: 9, background: h.rank === 1 ? "rgba(217,168,46,0.06)" : "rgba(255,255,255,0.02)" }}>
                  <span style={{ fontFamily: font.display, fontSize: 16, color: h.rank === 1 ? color.goldHi : color.mut, width: 20 }}>{h.rank}</span>
                  <span style={{ flex: 1, fontFamily: font.mono, fontSize: 12, color: color.txt }}>{h.userId.slice(0, 12)}</span>
                  <span style={{ fontFamily: font.mono, fontSize: 11, color: color.mut }}>{h.shares.toLocaleString()}</span>
                  <span style={{ fontFamily: font.display, fontSize: 15, color: color.cyanHi }}>{h.valueDisplay}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* contracts, audit, insurance tools */}
      <AthleteTools athleteId={a.id} />
      <AppraiserPicker athleteId={a.id} />

      {/* career / news timeline + verified contracts */}
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0,1.2fr) minmax(0,1fr)", marginTop: 16 }}>
        <Panel>
          <SectionTag>Career &amp; news history</SectionTag>
          <p style={{ color: color.mut, fontSize: 12, margin: "0 0 12px" }}>The full record that builds the value — college, NIL, draft, and upcoming-deal signals.</p>
          <div style={{ display: "grid", gap: 8 }}>
            {(a.timeline || []).map((t) => {
              const upcoming = t.kind === "upcoming_deal";
              return (
                <div key={t.id} style={{ display: "flex", gap: 10, padding: "9px 11px", border: `1px solid ${upcoming ? "rgba(217,168,46,0.35)" : color.line}`, borderRadius: 10, background: upcoming ? "rgba(217,168,46,0.05)" : "rgba(255,255,255,0.02)" }}>
                  <span style={{ fontFamily: font.mono, fontSize: 9, color: color.mut2, width: 70, flex: "none" }}>{t.date}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: color.txt }}>{t.title}</div>
                    {t.detail && <div style={{ fontSize: 11, color: color.mut, marginTop: 2 }}>{t.detail}</div>}
                  </div>
                  <Badge tone={upcoming ? "gold" : "mut"}>{t.kind.replace(/_/g, " ")}</Badge>
                </div>
              );
            })}
          </div>
        </Panel>
        <Panel>
          <SectionTag>Verified contracts → DCF</SectionTag>
          {(a.contracts || []).length === 0 ? (
            <p style={{ color: color.mut, fontSize: 12, margin: 0 }}>No contracts uploaded yet. Upload one above — it&apos;s CrownX-verified before its DCF enters the valuation.</p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {a.contracts.map((c) => (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 11px", border: `1px solid ${color.line}`, borderRadius: 10 }}>
                  <div>
                    <div style={{ fontSize: 12.5, color: color.txt }}>{c.counterparty} · {c.kind.toUpperCase()}</div>
                    <div style={{ fontFamily: font.mono, fontSize: 10, color: color.mut2 }}>{fmt(c.annualValueCents)}/yr × {c.termYears}y</div>
                  </div>
                  <Badge tone={c.verified ? "win" : "mut"}>{c.verified ? "verified ✓" : "pending"}</Badge>
                </div>
              ))}
            </div>
          )}
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

      {/* Royalty Vault — held-until-claim treasury connected to this athlete account */}
      <Panel style={{ marginTop: 16, border: `1px solid ${vault && vault.display.held !== "$0.00" ? color.goldHi : color.line}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <SectionTag>Royalty Vault · held-until-claim</SectionTag>
          {vault && (
            <Badge tone={vault.claimed ? "win" : vault.display.held !== "$0.00" ? "gold" : "mut"}>
              {vault.claimed ? "claimed ✓" : vault.display.held !== "$0.00" ? "royalties waiting" : "no royalties yet"}
            </Badge>
          )}
        </div>
        <p style={{ color: color.mut, fontSize: 12, margin: "0 0 12px" }}>
          Every resale settles {a.name}&apos;s 10% royalty on-chain. Their slice is <b style={{ color: color.txt }}>held in the CrownX treasury</b>,
          earmarked to this athlete account until they verify with biometrics and claim — the held-until-claim flywheel.
        </p>
        {vault ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
            <div style={{ padding: "12px 14px", border: `1px solid ${color.line}`, borderRadius: 10, background: "rgba(245,197,24,0.05)" }}>
              <div style={{ fontSize: 10, color: color.mut2, textTransform: "uppercase", letterSpacing: 0.5 }}>Held for athlete</div>
              <div style={{ fontFamily: font.display, fontSize: 24, color: color.goldHi }}>{vault.display.held}</div>
              <div style={{ fontFamily: font.mono, fontSize: 10, color: color.mut2 }}>across {vault.pieceCount} piece{vault.pieceCount === 1 ? "" : "s"}</div>
            </div>
            <div style={{ padding: "12px 14px", border: `1px solid ${color.line}`, borderRadius: 10 }}>
              <div style={{ fontSize: 10, color: color.mut2, textTransform: "uppercase", letterSpacing: 0.5 }}>Claimed lifetime</div>
              <div style={{ fontFamily: font.display, fontSize: 24, color: color.txt }}>{vault.display.claimedLifetime}</div>
              <div style={{ fontFamily: font.mono, fontSize: 10, color: color.mut2 }}>released to account</div>
            </div>
            <div style={{ padding: "12px 14px", border: `1px solid ${color.line}`, borderRadius: 10 }}>
              <div style={{ fontSize: 10, color: color.mut2, textTransform: "uppercase", letterSpacing: 0.5 }}>Donated forward</div>
              <div style={{ fontFamily: font.display, fontSize: 24, color: color.cyan }}>{vault.display.donation}</div>
              <div style={{ fontFamily: font.mono, fontSize: 10, color: color.mut2 }}>fan-elected gifts</div>
            </div>
          </div>
        ) : (
          <p style={{ color: color.mut2, fontSize: 12, margin: 0 }}>Vault initializing — held royalties appear here on the first resale.</p>
        )}
        {vault && !vault.claimed && vault.display.held !== "$0.00" && (
          <div style={{ marginTop: 12, textAlign: "center" }}>
            <ButtonLink href="/athlete" as={Link} variant="primary">Verify & claim {vault.display.held} →</ButtonLink>
          </div>
        )}
        {athleteCoa && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${color.line}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontSize: 12, color: color.mut }}>
              <b style={{ color: color.cyanHi }}>Genesis COA</b> · {athleteCoa.title} — dual-pane 3D/4D, viewable in AR/VR.
            </div>
            <ButtonLink href={`/coa/${athleteCoa.id}`} as={Link} variant="secondary">View COA in 3D/AR →</ButtonLink>
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
