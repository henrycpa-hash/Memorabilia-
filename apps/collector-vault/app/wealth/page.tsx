"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { SectionTag, Panel, Badge, ButtonLink, buttonStyle, LevelRing, color, font } from "@crownx-jewel/shared-design";

const GATEWAY = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000";

function session(): { sub: string; token: string } | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/cx_access=([^;]+)/);
  if (!m) return null;
  try {
    return { sub: JSON.parse(atob(m[1].split(".")[1])).sub as string, token: m[1] };
  } catch {
    return null;
  }
}

type Position = { athleteId: string; slug?: string; name: string; sport?: string; shares: number; valueDisplay: string; unrealizedCents: number; unrealizedDisplay: string };
type Portfolio = { positions: Position[]; netWorthCents: number; royaltyDividendsCents: number; display: { netWorth: string; holdingsValue: string; unrealized: string; royaltyDividends: string; projectedAnnualRoyalty: string } };
type Rank = { level: number; tier: string; pct: number; xp: number };
type DataDiv = { lifetimePaidCents: number; lifetimePaidDisplay: string; counts: { total: number; inUtilization: number }; shareOfPoolPct: string; consent: { aiModeling: boolean } };

export default function WealthPage() {
  const [sess, setSess] = useState<{ sub: string; token: string } | null>(null);
  const [pf, setPf] = useState<Portfolio | null>(null);
  const [rank, setRank] = useState<Rank | null>(null);
  const [slabs, setSlabs] = useState<number | null>(null);
  const [dataDiv, setDataDiv] = useState<DataDiv | null>(null);
  const [checkMsg, setCheckMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (s: { sub: string; token: string }) => {
    try {
      const [pfR, rR, ddR] = await Promise.all([
        fetch(`${GATEWAY}/api/portfolio/${s.sub}`).then((r) => r.json()),
        fetch(`${GATEWAY}/api/xp/rank/${s.sub}`).then((r) => r.json()),
        fetch(`${GATEWAY}/api/ai-modeling/user/${s.sub}`).then((r) => (r.ok ? r.json() : null)).catch(() => null)
      ]);
      setPf(pfR);
      setRank(rR);
      setDataDiv(ddR);
      const v = await fetch(`${GATEWAY}/api/vault/me`, { headers: { authorization: `Bearer ${s.token}` } }).then((r) => (r.ok ? r.json() : []));
      setSlabs(Array.isArray(v) ? v.length : 0);
    } catch {
      /* offline */
    }
  }, []);

  useEffect(() => {
    const s = session();
    setSess(s);
    if (s) load(s);
  }, [load]);

  async function checkIn() {
    if (!sess) return;
    setBusy(true);
    try {
      const r = await fetch(`${GATEWAY}/api/xp/streak/checkin`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: sess.sub }) }).then((x) => x.json());
      if (r.capped) setCheckMsg("✓ Already checked in today — come back tomorrow to keep the streak.");
      else setCheckMsg(`✓ +${r.vxpGranted} VXP · daily wealth streak counted.`);
      load(sess);
    } finally {
      setBusy(false);
    }
  }

  if (!sess) {
    return (
      <Panel glow>
        <h1 style={{ fontFamily: font.display, fontWeight: 400, fontSize: 34, margin: "0 0 8px" }}>Your wealth, building daily.</h1>
        <p style={{ color: color.mut, margin: "0 0 16px" }}>Sign in to see your net worth, royalty streams, and today&apos;s actions.</p>
        <ButtonLink href="/login" as={Link} variant="primary">Authenticate →</ButtonLink>
      </Panel>
    );
  }

  const up = (pf?.positions || []).reduce((s, p) => s + p.unrealizedCents, 0) >= 0;
  const dataCents = dataDiv?.lifetimePaidCents || 0;
  const totalCents = (pf?.netWorthCents || 0) + dataCents;
  const fmt = (c: number) => (c >= 100_000_000 ? `$${(c / 100_000_000).toFixed(2)}M` : c >= 100_000 ? `$${(c / 100_000).toFixed(1)}K` : `$${(c / 100).toFixed(2)}`);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* net worth hero — billion-dollar feel (holdings + royalties + data dividends) */}
      <section style={{ textAlign: "center", padding: "26px 0 12px", position: "relative" }}>
        <div style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: color.gold }}>Your CrownX net worth</div>
        <div style={{ fontFamily: font.display, fontWeight: 400, fontSize: "clamp(56px,12vw,120px)", lineHeight: 0.9, margin: "8px 0 0", background: "linear-gradient(180deg, #fff, #f7e08a 45%, #8a6310 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", filter: "drop-shadow(0 6px 40px rgba(217,168,46,0.25))" }}>
          {totalCents ? fmt(totalCents) : pf?.display.netWorth || "$0.00"}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 14, flexWrap: "wrap" }}>
          <Badge tone={up ? "win" : "hot"}>{up ? "▲" : "▼"} {pf?.display.unrealized} unrealized</Badge>
          <Badge tone="gold">{pf?.display.royaltyDividends} royalties earned</Badge>
          {dataCents > 0 && <Badge tone="cyan">{dataDiv?.lifetimePaidDisplay} data dividends</Badge>}
          <Badge tone="cyan">{slabs ?? 0} slabs owned</Badge>
        </div>
      </section>

      {/* the daily loop */}
      <Panel glow style={{ marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          {rank && <LevelRing level={rank.level} tier={rank.tier} pct={rank.pct} size={72} />}
          <div style={{ flex: 1, minWidth: 220 }}>
            <SectionTag>Today&apos;s wealth loop</SectionTag>
            <p style={{ color: color.mut, fontSize: 13, margin: "0 0 12px" }}>Three moves a day compound into royalty streams and rank. Start with your check-in.</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={checkIn} disabled={busy} style={buttonStyle("gold")}>🔥 Daily check-in</button>
              <ButtonLink href="/athletes" as={Link} variant="primary">📈 Trade the Exchange</ButtonLink>
              <ButtonLink href="/mint" as={Link} variant="secondary">🎴 Authenticate &amp; mint</ButtonLink>
              <ButtonLink href="/data" as={Link} variant="secondary">{dataDiv?.consent.aiModeling ? "🤖 Your data dividends" : "🤖 Earn from your data"}</ButtonLink>
            </div>
            {checkMsg && <div style={{ fontFamily: font.mono, fontSize: 11, color: color.win, marginTop: 10 }}>{checkMsg}</div>}
          </div>
        </div>
      </Panel>

      {/* wealth stats */}
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginTop: 16 }}>
        <WealthStat label="Holdings value" value={pf?.display.holdingsValue || "$0"} tone={color.cyanHi} />
        <WealthStat label="Royalty income" value={pf?.display.royaltyDividends || "$0"} tone={color.goldHi} />
        <WealthStat label="AI-modeling dividends" value={dataDiv?.lifetimePaidDisplay || "$0"} tone={color.cyanHi} />
        <WealthStat label="Projected annual royalties" value={pf?.display.projectedAnnualRoyalty || "$0"} tone={color.goldHi} />
      </div>

      {/* athlete portfolio */}
      <Panel style={{ marginTop: 16 }}>
        <SectionTag>Your athlete portfolio</SectionTag>
        {(pf?.positions || []).length === 0 ? (
          <p style={{ color: color.mut, fontSize: 13, margin: 0 }}>
            You don&apos;t own a piece of any athlete yet. <Link href="/athletes" style={{ color: color.cyan }}>Buy fractional shares →</Link> to start a royalty stream.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {(pf?.positions || []).map((p) => {
              const gain = p.unrealizedCents >= 0;
              return (
                <Link key={p.athleteId} href={`/athletes/${p.slug || p.athleteId}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 13px", border: `1px solid ${color.line}`, borderRadius: 11, background: "rgba(255,255,255,0.02)" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.display, fontSize: 15, color: color.void, background: `linear-gradient(135deg, ${color.cyanHi}, ${color.cyanDk})` }}>{p.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, color: color.txt }}>{p.name}</div>
                      <div style={{ fontFamily: font.mono, fontSize: 10, color: color.mut2 }}>{p.shares.toLocaleString()} shares · {p.sport}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: font.display, fontSize: 18, color: color.cyanHi }}>{p.valueDisplay}</div>
                      <div style={{ fontFamily: font.mono, fontSize: 11, color: gain ? color.win : color.hot }}>{gain ? "+" : ""}{p.unrealizedDisplay}</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Panel>

      <p style={{ fontFamily: font.mono, fontSize: 10, color: color.mut2, marginTop: 16, textAlign: "center", letterSpacing: "0.04em" }}>
        Wealth compounds: own slabs + athlete shares → earn royalties on every resale → reinvest → climb /LV99 → unlock the rarest drops.
      </p>
    </div>
  );
}

function WealthStat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div style={{ background: "linear-gradient(165deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))", border: `1px solid ${color.line}`, borderRadius: 14, padding: 16 }}>
      <div style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: color.mut }}>{label}</div>
      <div style={{ fontFamily: font.display, fontSize: 30, lineHeight: 0.95, marginTop: 8, color: tone }}>{value}</div>
    </div>
  );
}
