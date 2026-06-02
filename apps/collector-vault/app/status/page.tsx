"use client";

import { useMemo, useState } from "react";
import { SectionTag, Panel, Badge, LevelRing, color, font } from "@crownx-jewel/shared-design";
import {
  MAX_LEVEL,
  XP_ACTIONS,
  cumulativeXpForLevel,
  levelFromXp,
  tierForLevel,
  progress,
  TIERS,
  type XpActionKey
} from "@crownx-jewel/shared-xp";

/**
 * /LV99 status engine — now driven by the CANONICAL economy in
 * @crownx-jewel/shared-xp (curve round(60·N^1.95), 7 tiers, exact XP values),
 * identical to the server-side xp-service. Earn actions post to the live
 * gateway (/api/xp/grant) when a session exists; the local meter mirrors it.
 * Integrity: XP-only (Floor Call never a cash wager), disclosed values, 18+.
 */

const GATEWAY = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000";

// the earn buttons surfaced on the page (subset of the full economy)
const EARN: { key: XpActionKey; tone: "cyan" | "gold" | "win" }[] = [
  { key: "mint_standard", tone: "cyan" },
  { key: "mint_top", tone: "gold" },
  { key: "first_mint", tone: "win" },
  { key: "invite_converted", tone: "gold" },
  { key: "slab_shared", tone: "win" },
  { key: "daily_return", tone: "cyan" }
];

function readCookieSub(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/cx_access=([^;]+)/);
  if (!m) return null;
  try {
    return JSON.parse(atob(m[1].split(".")[1])).sub as string;
  } catch {
    return null;
  }
}

export default function StatusPage() {
  const [xp, setXp] = useState(() => cumulativeXpForLevel(72)); // start as LV72 ASCENDANT
  const [pop, setPop] = useState<{ id: number; xp: number } | null>(null);
  const [leveledTo, setLeveledTo] = useState<number | null>(null);

  const p = useMemo(() => progress(xp), [xp]);
  const tier = p.tier;

  function earn(action: XpActionKey) {
    const def = XP_ACTIONS[action];
    const before = levelFromXp(xp);
    const next = xp + def.vxp;
    const after = levelFromXp(next);
    setXp(next);
    setPop({ id: Date.now(), xp: def.vxp });
    setTimeout(() => setPop(null), 1000);
    if (navigator.vibrate) navigator.vibrate(after > before ? [12, 30, 60] : 10);
    if (after > before) {
      setLeveledTo(after);
      setTimeout(() => setLeveledTo(null), 1900);
    }
    // best-effort live grant to the append-only ledger
    const userId = readCookieSub();
    if (userId) {
      fetch(`${GATEWAY}/api/xp/grant`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, action })
      }).catch(() => undefined);
    }
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", position: "relative" }}>
      <SectionTag>/LV99 Status</SectionTag>
      <h1 style={{ fontFamily: font.display, fontWeight: 400, fontSize: 40, margin: "0 0 18px" }}>A rank that only climbs.</h1>

      <Panel glow>
        <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          <LevelRing level={p.level} tier={tier} pct={p.pct} size={84} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontFamily: font.mono, fontSize: 11, color: color.mut }}>
              {xp.toLocaleString()} VXP · {p.level >= MAX_LEVEL ? "MAX — CROWN" : `${p.xpToNext.toLocaleString()} to LV${p.level + 1}`}
            </div>
            <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.08)", marginTop: 8, overflow: "hidden" }}>
              <span style={{ display: "block", height: "100%", width: `${p.pct}%`, borderRadius: 4, background: `linear-gradient(90deg, ${color.cyanDk}, ${color.cyanHi})`, boxShadow: "0 0 10px rgba(63,217,212,0.6)", transition: "width .5s" }} />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <Badge tone="cyan">{tier}</Badge>
              {p.level >= 45 && <Badge tone="gold">1.5× invite XP</Badge>}
            </div>
          </div>
        </div>
      </Panel>

      {/* earn XP */}
      <div style={{ marginTop: 18 }}>
        <SectionTag>Earn XP — disclosed values</SectionTag>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          {EARN.map((a) => {
            const def = XP_ACTIONS[a.key];
            return (
              <button
                key={a.key}
                onClick={() => earn(a.key)}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "13px 14px", borderRadius: 12, border: `1px solid ${color.line2}`, background: "rgba(255,255,255,0.03)", color: color.txt, cursor: "pointer", textAlign: "left" }}
              >
                <span>
                  <span style={{ fontSize: 13, fontWeight: 600, display: "block" }}>{def.label}</span>
                  <span style={{ fontFamily: font.mono, fontSize: 9, color: color.mut2 }}>{def.cadence}</span>
                </span>
                <span style={{ fontFamily: font.mono, fontSize: 13, fontWeight: 600, color: a.tone === "gold" ? color.goldHi : a.tone === "win" ? color.win : color.cyanHi }}>+{def.vxp}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* the 7-tier ladder */}
      <div style={{ marginTop: 18 }}>
        <SectionTag>The seven tiers</SectionTag>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          {TIERS.map((t) => {
            const reached = p.level >= t.minLevel;
            return (
              <div key={t.name} style={{ padding: "12px 13px", border: `1px solid ${reached ? "rgba(63,217,212,0.4)" : color.line}`, borderRadius: 11, background: reached ? "rgba(63,217,212,0.05)" : "rgba(255,255,255,0.02)", opacity: reached ? 1 : 0.5 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontFamily: font.display, fontSize: 18, color: reached ? color.cyanHi : color.txt }}>{t.name}</span>
                  <span style={{ fontFamily: font.mono, fontSize: 9, color: color.mut }}>LV{t.minLevel}{t.maxLevel > t.minLevel ? `–${t.maxLevel}` : ""}</span>
                </div>
                <div style={{ fontSize: 11, color: color.mut, marginTop: 6 }}>{t.unlocks[0]}</div>
              </div>
            );
          })}
        </div>
      </div>

      <p style={{ fontFamily: font.mono, fontSize: 10, color: color.mut2, marginTop: 16, textAlign: "center", letterSpacing: "0.04em" }}>
        XP can&apos;t be bought — only earned through value-creating protocol actions. The ledger is append-only and on-chain-anchored. 18+.
      </p>

      {pop && (
        <div key={pop.id} style={{ position: "fixed", left: "50%", top: "40%", transform: "translate(-50%,-50%)", zIndex: 9500, fontFamily: font.display, fontSize: 44, color: color.cyanHi, textShadow: "0 0 22px rgba(63,217,212,0.7)", pointerEvents: "none", animation: "cx-fade .3s" }}>
          +{pop.xp} VXP
        </div>
      )}
      {leveledTo && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9600, background: "rgba(3,5,11,0.93)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", padding: 30, animation: "cx-fade .3s" }}>
          <div style={{ fontFamily: font.display, fontSize: 84, letterSpacing: "0.02em", background: "conic-gradient(from 200deg,#8ff5f1,#3fd9d4,#f7e08a,#8ff5f1)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", animation: "cx-reveal-pop .8s cubic-bezier(.2,1.3,.4,1)" }}>
            LV{leveledTo}
          </div>
          <div style={{ fontFamily: font.mono, fontSize: 12, letterSpacing: "0.28em", textTransform: "uppercase", color: color.cyan, marginTop: 8 }}>{tierForLevel(leveledTo).name}</div>
        </div>
      )}
    </div>
  );
}
