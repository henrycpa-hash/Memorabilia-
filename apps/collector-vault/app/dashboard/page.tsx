"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { clientSession, clientAuthedGet, clientPublicGet } from "../../lib/clientAuth";
import { LiveFloor } from "../_components/LiveFloor";
import {
  Panel,
  Stat,
  SectionTag,
  LevelRing,
  ActivityFeed,
  ButtonLink,
  Badge,
  color,
  font,
  type FeedEvent
} from "@crownx-jewel/shared-design";

type Asset = { id: string };
type Notification = { id: string; status: string; title?: string; body?: string; type?: string; createdAt?: string };
type LeaderRow = { rank: number; userId: string; xp: number; level: number; tier: string };
type AthleteRow = { id: string; slug: string; name: string; sport: string; team: string; priceDisplay: string; change24h: number };
type Wealth = { display: { netWorth: string; royaltyDividends: string; unrealized: string } };

const SAMPLE_FEED: FeedEvent[] = [
  { id: "f1", actor: "vaultmaster", level: 72, kind: "mint", text: "minted a Genesis slab · Game-Worn '24", meta: "2m ago · COA #A7F3" },
  { id: "f2", actor: "kc_collector", level: 41, kind: "royalty", text: "earned a royalty payout on a resale hop", meta: "11m ago · +$48.10" },
  { id: "f3", actor: "rookieszn", level: 19, kind: "level", text: "ascended to a new /LV99 rank", meta: "23m ago · LV19 → LV20" },
  { id: "f4", actor: "floor_watch", kind: "floor", text: "the Vault Floor Index crossed a new high", meta: "34m ago" }
];

export default function DashboardPage() {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [vault, setVault] = useState<Asset[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderRow[]>([]);
  const [athletes, setAthletes] = useState<AthleteRow[]>([]);
  const [wealth, setWealth] = useState<Wealth | null>(null);

  useEffect(() => {
    const s = clientSession();
    if (!s) {
      setSignedIn(false);
      setReady(true);
      return;
    }
    setSignedIn(true);
    Promise.all([
      clientAuthedGet<Asset[]>("/api/vault/me"),
      clientAuthedGet<Notification[]>("/api/notifications/me"),
      clientPublicGet<LeaderRow[]>("/api/xp/leaderboard?limit=5"),
      clientPublicGet<AthleteRow[]>("/api/athletes"),
      clientPublicGet<Wealth>(`/api/portfolio/${s.sub}`)
    ]).then(([v, n, l, a, w]) => {
      // an authed call returning null with a valid token means "no data yet", not "signed out"
      setVault(v || []);
      setNotifications(n || []);
      setLeaderboard(l || []);
      setAthletes(a || []);
      setWealth(w);
      setReady(true);
    });
  }, []);

  if (ready && !signedIn) {
    return (
      <section>
        <SectionTag>Vault Dashboard</SectionTag>
        <Panel glow>
          <h1 style={{ fontFamily: font.display, fontWeight: 400, fontSize: 36, margin: "0 0 8px" }}>One tap from your Vault</h1>
          <p style={{ color: color.mut, margin: "0 0 16px" }}>
            You&apos;re not signed in yet. Authenticate with a passkey to see your slabs, royalty yield, and live floor.
          </p>
          <ButtonLink href="/login" as={Link} variant="primary">
            Authenticate →
          </ButtonLink>
        </Panel>
      </section>
    );
  }

  const notes = notifications || [];
  const unread = notes.filter((n) => n.status === "unread").length;

  // derive feed from real notifications where available, else sample mechanics
  const feed: FeedEvent[] = notes.length
    ? notes.slice(0, 5).map((n, i) => ({
        id: n.id,
        actor: "your vault",
        kind: (["mint", "royalty", "level", "floor"] as const)[i % 4],
        text: n.title || n.body || "vault activity",
        meta: n.createdAt ? new Date(n.createdAt).toLocaleString() : n.type
      }))
    : SAMPLE_FEED;

  return (
    <section>
      <SectionTag>Vault Dashboard</SectionTag>

      {/* net-worth hero — your wealth at a glance, into the daily loop */}
      <Link href="/wealth" style={{ textDecoration: "none", color: "inherit" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", padding: "20px 22px", borderRadius: 18, marginBottom: 20, border: "1px solid rgba(217,168,46,0.3)", background: "linear-gradient(135deg, rgba(217,168,46,0.08), rgba(63,217,212,0.04))" }}>
          <div>
            <div style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: color.gold }}>Net worth</div>
            <div style={{ fontFamily: font.display, fontSize: 52, lineHeight: 0.9, marginTop: 4, background: "linear-gradient(180deg,#fff,#f7e08a 55%,#8a6310)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
              {wealth?.display.netWorth || "$0.00"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <Badge tone="gold">{wealth?.display.royaltyDividends || "$0"} royalties</Badge>
            <Badge tone="win">{wealth?.display.unrealized || "$0"} P&amp;L</Badge>
            <span style={{ fontFamily: font.mono, fontSize: 11, color: color.cyan }}>Open Wealth →</span>
          </div>
        </div>
      </Link>

      <h1 style={{ fontFamily: font.display, fontWeight: 400, fontSize: 40, margin: "0 0 20px" }}>Your collection, alive.</h1>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <Stat label="Slabs owned" value={vault.length} tone="cyan" />
        <Stat label="Activity events" value={notes.length} tone="gold" />
        <Stat label="Unread" value={unread} tone={unread ? "hot" : "win"} />
      </div>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr)", marginTop: 16 }}>
        <LiveFloor feedUrl={undefined} />
        <Panel>
          <SectionTag>/LV99 Status</SectionTag>
          <LevelRing level={72} tier="ASCENDANT" pct={72} />
          <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.08)", marginTop: 14, overflow: "hidden" }}>
            <span style={{ display: "block", height: "100%", width: "72%", borderRadius: 3, background: `linear-gradient(90deg, ${color.cyanDk}, ${color.cyanHi})`, boxShadow: "0 0 10px rgba(63,217,212,0.6)" }} />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <Badge tone="cyan">Founder drops</Badge>
            <Badge tone="gold">85% royalty keep</Badge>
            <Badge tone="mut">Streak ×3</Badge>
          </div>
        </Panel>
      </div>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", marginTop: 16 }}>
        {/* live weekly leaderboard from the xp-service */}
        <Panel>
          <SectionTag>Weekly Leaderboard</SectionTag>
          {(leaderboard || []).length === 0 ? (
            <p style={{ color: color.mut, fontSize: 13, margin: 0 }}>Earn XP on /LV99 to climb the board.</p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {(leaderboard || []).map((r) => (
                <div key={r.userId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: `1px solid ${color.line}`, borderRadius: 10, background: r.rank === 1 ? "rgba(217,168,46,0.06)" : "rgba(255,255,255,0.02)" }}>
                  <span style={{ fontFamily: font.display, fontSize: 18, color: r.rank === 1 ? color.goldHi : color.mut, width: 24 }}>{r.rank}</span>
                  <span style={{ flex: 1, fontSize: 13, color: color.txt }}>{r.userId.slice(0, 12)}</span>
                  <Badge tone={r.rank === 1 ? "gold" : "cyan"}>LV{r.level} {r.tier}</Badge>
                  <span style={{ fontFamily: font.mono, fontSize: 11, color: color.mut }}>{r.xp.toLocaleString()}xp</span>
                </div>
              ))}
            </div>
          )}
          <Link href="/status" style={{ fontFamily: font.mono, fontSize: 11, color: color.cyan, display: "inline-block", marginTop: 12 }}>Climb /LV99 →</Link>
        </Panel>

        {/* athlete exchange ticker */}
        <Panel>
          <SectionTag>Athlete Exchange</SectionTag>
          {(athletes || []).length === 0 ? (
            <p style={{ color: color.mut, fontSize: 13, margin: 0 }}>The exchange is warming up.</p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {(athletes || []).slice(0, 4).map((a) => {
                const up = a.change24h >= 0;
                return (
                  <Link key={a.id} href={`/athletes/${a.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: `1px solid ${color.line}`, borderRadius: 10, background: "rgba(255,255,255,0.02)" }}>
                      <span style={{ flex: 1, fontSize: 13, color: color.txt }}>{a.name} <span style={{ color: color.mut2, fontFamily: font.mono, fontSize: 9 }}>{a.team}</span></span>
                      <span style={{ fontFamily: font.display, fontSize: 17, color: color.cyanHi }}>{a.priceDisplay}</span>
                      <span style={{ fontFamily: font.mono, fontSize: 11, fontWeight: 600, color: up ? color.win : color.hot, width: 56, textAlign: "right" }}>{up ? "+" : ""}{a.change24h}%</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
          <Link href="/athletes" style={{ fontFamily: font.mono, fontSize: 11, color: color.cyan, display: "inline-block", marginTop: 12 }}>Own a piece →</Link>
        </Panel>
      </div>

      <Panel style={{ marginTop: 16 }}>
        <SectionTag>Live Activity</SectionTag>
        <ActivityFeed events={feed} />
      </Panel>
    </section>
  );
}
