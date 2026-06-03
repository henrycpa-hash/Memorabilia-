"use client";

import { useCallback, useEffect, useState } from "react";
import { SectionTag, Panel, Badge, buttonStyle, color, font } from "@crownx-jewel/shared-design";

const GATEWAY = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000";
const ME = "henry"; // demo identity

/**
 * The AI-Modeling Data Dividend. Sovereignty data consent → as CrownX's
 * authentication AI improves it learns from your CONSENTED capture data. Each
 * contribution mints a weighted token; tokens whose data is in utilization in
 * the live pro product earn a pro-rata share of an AI-modeling compensation pool
 * — board-allocated from profit, honored on-chain, paid BEFORE dividends.
 */

type Token = { id: string; assetId: string; weightBps: number; weightDisplay: string; assetClass?: string; inUtilization: boolean; modelUpdateId?: string; hashedToUpdate?: string };
type UserDash = {
  consent: { aiModeling: boolean; scopes: string[] };
  tokens: Token[];
  counts: { total: number; inUtilization: number };
  shareOfPoolPct: string;
  lifetimePaidDisplay: string;
};
type Pool = { revenueTotalDisplay: string; unallocatedRevenueDisplay: string; tokensTotal: number; tokensInUtilization: number; modelUpdates: number; deployedUpdates: number; epochs: number; boardAllocBps: number; boardAllocPct: number; boardAllocCeilingPct: number; governance: string; lastEpoch: { poolDisplay: string; status: string } | null };
type ModelUpdate = { id: string; version: string; note: string; tokenCount: number; deployed: boolean };
type LeaderRow = { rank: number; holderId: string; tokens: number; live: number; lifetimePaidDisplay: string; shareOfPoolPct: string };

export default function DataDividendPage() {
  const [dash, setDash] = useState<UserDash | null>(null);
  const [pool, setPool] = useState<Pool | null>(null);
  const [updates, setUpdates] = useState<ModelUpdate[]>([]);
  const [board, setBoard] = useState<LeaderRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [d, p, u, lb] = await Promise.all([
        fetch(`${GATEWAY}/api/ai-modeling/user/${ME}`).then((r) => r.json()),
        fetch(`${GATEWAY}/api/ai-modeling/pool`).then((r) => r.json()),
        fetch(`${GATEWAY}/api/ai-modeling/model-updates`).then((r) => r.json()),
        fetch(`${GATEWAY}/api/ai-modeling/leaderboard`).then((r) => r.json())
      ]);
      setDash(d); setPool(p); setUpdates(u.updates || []); setBoard(lb.leaderboard || []);
    } catch { /* offline */ }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  async function setConsent(on: boolean) {
    setBusy(true);
    await fetch(`${GATEWAY}/api/ai-modeling/consent/${ME}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ aiModeling: on, scopes: ["capture", "sensor_fusion"] }) }).catch(() => undefined);
    await refresh(); setBusy(false);
  }

  // demo: run a compensation epoch (board allocates from profit, distribute pro-rata)
  async function runEpoch() {
    setBusy(true); setMsg("Allocating pool from AI-attributable profit (before dividends)…");
    try {
      const ep = await fetch(`${GATEWAY}/api/ai-modeling/epoch`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}) }).then((r) => r.json());
      const dist = await fetch(`${GATEWAY}/api/ai-modeling/epoch/${ep.epoch.id}/distribute`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}) }).then((r) => r.json());
      setMsg(`✓ Pool ${ep.epoch.poolDisplay} distributed ${dist.distributedDisplay} across ${dist.activeTokens} in-utilization tokens · paid BEFORE shareholder dividends · anchored ${String(dist.anchor?.txRef || "").slice(0, 14)}…`);
    } catch { setMsg("✗ ai-modeling service unavailable"); }
    await refresh(); setBusy(false);
  }

  const consented = dash?.consent.aiModeling;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <SectionTag>AI-Modeling Data Dividend</SectionTag>
      <h1 style={{ fontFamily: font.display, fontWeight: 400, fontSize: 44, margin: "0 0 4px" }}>Your data trains the AI. <span style={{ color: color.cyanHi }}>You get paid for it.</span></h1>
      <p style={{ color: color.mut, fontSize: 13, maxWidth: 680, margin: 0 }}>
        As CrownX&apos;s authentication AI improves, it learns from your <b style={{ color: color.txt }}>consented</b> capture data. Each
        contribution mints a weighted token; tokens whose data is <b style={{ color: color.txt }}>in utilization in the live product</b> earn a
        pro-rata share of an AI-modeling compensation pool — board-allocated from profit, honored on-chain, paid <b style={{ color: color.goldHi }}>before shareholder dividends</b>.
      </p>

      {/* consent + earnings */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 14, marginTop: 18 }}>
        <Panel style={{ borderColor: consented ? "rgba(55,211,154,0.4)" : color.line }}>
          <SectionTag>Sovereignty data consent</SectionTag>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
            <div style={{ fontSize: 13, color: color.txt }}>{consented ? "AI-modeling consent ON" : "Consent OFF"}</div>
            <Badge tone={consented ? "win" : "mut"}>{consented ? "earning" : "not earning"}</Badge>
          </div>
          <p style={{ fontSize: 11, color: color.mut, margin: "8px 0 12px" }}>Raw signals stay sealed in your device enclave; only consented templates train the model. Revoke anytime.</p>
          <button onClick={() => setConsent(!consented)} disabled={busy} style={{ ...buttonStyle(consented ? "secondary" : "primary"), width: "100%" }}>{consented ? "Revoke consent" : "Consent to AI modeling"}</button>
        </Panel>
        <Panel glow>
          <SectionTag>Your earnings</SectionTag>
          <div style={{ fontFamily: font.display, fontSize: 40, color: color.goldHi, lineHeight: 1, marginTop: 6 }}>{dash?.lifetimePaidDisplay || "$0.00"}</div>
          <div style={{ fontFamily: font.mono, fontSize: 10, color: color.mut2, marginTop: 4 }}>lifetime AI-modeling dividends</div>
          <div style={{ display: "flex", gap: 14, marginTop: 12, fontFamily: font.mono, fontSize: 11, color: color.mut }}>
            <span><b style={{ color: color.cyanHi }}>{dash?.counts.inUtilization ?? 0}</b>/{dash?.counts.total ?? 0} tokens live</span>
            <span><b style={{ color: color.cyanHi }}>{dash?.shareOfPoolPct ?? "0"}%</b> of pool</span>
          </div>
        </Panel>
        <Panel>
          <SectionTag>Compensation pool</SectionTag>
          <div style={{ fontFamily: font.mono, fontSize: 11.5, color: color.txt, lineHeight: 1.8, marginTop: 6 }}>
            Revenue tied: <b style={{ color: color.cyanHi }}>{pool?.revenueTotalDisplay || "$0"}</b><br />
            Last pool: <b style={{ color: color.goldHi }}>{pool?.lastEpoch?.poolDisplay || "—"}</b> ({pool?.lastEpoch?.status || "none"})<br />
            Board alloc: <b style={{ color: color.goldHi }}>{pool?.boardAllocPct ?? 3}%</b> of profit → scales to {pool?.boardAllocCeilingPct ?? 5}% · before dividends<br />
            Live tokens: {pool?.tokensInUtilization ?? 0}/{pool?.tokensTotal ?? 0}
          </div>
          <button onClick={runEpoch} disabled={busy} style={{ ...buttonStyle("secondary"), width: "100%", marginTop: 10, fontSize: 12 }}>Run compensation epoch →</button>
        </Panel>
      </div>
      {msg && <div style={{ fontFamily: font.mono, fontSize: 11.5, color: color.txt, marginTop: 12, lineHeight: 1.6, background: "rgba(63,217,212,0.05)", border: `1px solid ${color.line}`, borderRadius: 10, padding: "10px 12px" }}>{msg}</div>}

      {/* your tokens */}
      <Panel style={{ marginTop: 16 }}>
        <SectionTag>Your data contribution tokens · weighted rate</SectionTag>
        {dash && dash.tokens.length > 0 ? (
          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            {dash.tokens.map((t) => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 12px", border: `1px solid ${t.inUtilization ? "rgba(55,211,154,0.35)" : color.line}`, borderRadius: 10, background: t.inUtilization ? "rgba(55,211,154,0.04)" : "rgba(255,255,255,0.02)" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: color.txt }}>{t.assetClass || "asset"} · {t.assetId.slice(0, 16)}</div>
                  <div style={{ fontFamily: font.mono, fontSize: 9, color: color.mut2 }}>{t.id.slice(0, 14)} {t.hashedToUpdate ? `· hashed→update ${t.hashedToUpdate.slice(0, 12)}` : "· awaiting model update"}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
                  <span style={{ fontFamily: font.display, fontSize: 20, color: color.goldHi }}>{t.weightDisplay}</span>
                  <Badge tone={t.inUtilization ? "win" : "mut"}>{t.inUtilization ? "in utilization" : "pending"}</Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: color.mut2, fontSize: 12, margin: "8px 0 0" }}>{consented ? "No tokens yet — authenticate a mint to contribute consented capture data." : "Consent to AI modeling to start earning from your contributions."}</p>
        )}
      </Panel>

      {/* model updates the tokens are hashed to */}
      <Panel style={{ marginTop: 16 }}>
        <SectionTag>Model improvement updates · tokens hashed in</SectionTag>
        {updates.length > 0 ? (
          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            {updates.map((u) => (
              <div key={u.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 12px", border: `1px solid ${color.line}`, borderRadius: 10 }}>
                <div>
                  <div style={{ fontSize: 13, color: color.txt }}>{u.version} <span style={{ fontFamily: font.mono, fontSize: 9, color: color.mut2 }}>· {u.tokenCount} tokens</span></div>
                  <div style={{ fontSize: 11, color: color.mut, marginTop: 2 }}>{u.note}</div>
                </div>
                <Badge tone={u.deployed ? "win" : "cyan"}>{u.deployed ? "live in pro ✓" : "staged"}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: color.mut2, fontSize: 12, margin: "8px 0 0" }}>No model updates yet.</p>
        )}
      </Panel>

      {/* viral: top data contributors */}
      <Panel style={{ marginTop: 16 }}>
        <SectionTag>Top data contributors · the AI-modeling leaderboard</SectionTag>
        {board.length > 0 ? (
          <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
            {board.map((h) => (
              <div key={h.holderId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 12px", border: `1px solid ${h.holderId === ME ? color.cyan : color.line}`, borderRadius: 10, background: h.holderId === ME ? "rgba(63,217,212,0.06)" : "transparent" }}>
                <span style={{ fontFamily: font.display, fontSize: 18, color: h.rank <= 3 ? color.goldHi : color.mut, width: 28 }}>#{h.rank}</span>
                <span style={{ flex: 1, fontSize: 13, color: color.txt }}>{h.holderId}{h.holderId === ME ? " (you)" : ""} <span style={{ fontFamily: font.mono, fontSize: 9, color: color.mut2 }}>· {h.live}/{h.tokens} live · {h.shareOfPoolPct}% of pool</span></span>
                <span style={{ fontFamily: font.display, fontSize: 18, color: color.goldHi }}>{h.lifetimePaidDisplay}</span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: color.mut2, fontSize: 12, margin: "8px 0 0" }}>No contributors yet.</p>
        )}
        <p style={{ fontFamily: font.mono, fontSize: 9, color: color.mut2, marginTop: 10 }}>When a model improvement ships to the live product, its contributors are announced on the network feed — your data, paying you, in public.</p>
      </Panel>

      <p style={{ fontFamily: font.mono, fontSize: 9.5, color: color.mut2, lineHeight: 1.7, marginTop: 16, maxWidth: 760 }}>
        Weighted rate is a dynamic calculation of data value — sensor-matrix coverage, rarity (inverse commonness), signature
        complexity, authentication confidence, and frontier novelty. Tokens are hashed to the model update they fed; in-utilization
        tokens share the pool pro-rata by weight. Differential privacy on aggregates; raw signals never leave your enclave without consent.
      </p>
    </div>
  );
}
