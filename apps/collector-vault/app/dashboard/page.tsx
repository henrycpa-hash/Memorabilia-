import Link from "next/link";
import { authedGet } from "../../lib/api";
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

const SAMPLE_FEED: FeedEvent[] = [
  { id: "f1", actor: "vaultmaster", level: 72, kind: "mint", text: "minted a Genesis slab · Game-Worn '24", meta: "2m ago · COA #A7F3" },
  { id: "f2", actor: "kc_collector", level: 41, kind: "royalty", text: "earned a royalty payout on a resale hop", meta: "11m ago · +$48.10" },
  { id: "f3", actor: "rookieszn", level: 19, kind: "level", text: "ascended to a new /LV99 rank", meta: "23m ago · LV19 → LV20" },
  { id: "f4", actor: "floor_watch", kind: "floor", text: "the Vault Floor Index crossed a new high", meta: "34m ago" }
];

export default async function DashboardPage() {
  const [vault, notifications] = await Promise.all([
    authedGet<Asset[]>("/api/vault/me"),
    authedGet<Notification[]>("/api/notifications/me")
  ]);

  if (vault === null) {
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

      <Panel style={{ marginTop: 16 }}>
        <SectionTag>Live Activity</SectionTag>
        <ActivityFeed events={feed} />
      </Panel>
    </section>
  );
}
