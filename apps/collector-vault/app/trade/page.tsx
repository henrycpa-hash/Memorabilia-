"use client";

import { useState } from "react";
import { SectionTag, Panel, Badge, buttonStyle, color, font } from "@crownx-jewel/shared-design";

const GATEWAY = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000";

type Step = { state: string; at: string; note?: string; tx: string };
type Trade = {
  id: string; assetId: string; sellerId: string; buyerId: string;
  priceDisplay: string; escrowDisplay: string; state: string; progress: number;
  packCoa?: string; shipCoa?: string; genesisCoa?: string;
  tracking?: { carrier: string; number: string; status: string };
  coaReleased: boolean; fundsReleased: boolean; steps: Step[];
};

const PIPELINE = [
  { key: "listed", label: "Sell", icon: "🏷" },
  { key: "paid_escrow", label: "Escrow", icon: "🔒" },
  { key: "packaged", label: "Package COA", icon: "📦" },
  { key: "shipped", label: "Ship COA", icon: "🚚" },
  { key: "delivered", label: "Delivered", icon: "📍" },
  { key: "authenticated", label: "Authenticate", icon: "🔍" },
  { key: "released", label: "COA + Funds", icon: "👑" }
];
const reached = (state: string, key: string) => {
  const order = PIPELINE.map((p) => p.key);
  const si = order.indexOf(state === "in_transit" ? "shipped" : state === "authenticating" ? "delivered" : state);
  return si >= order.indexOf(key);
};

export default function TradePage() {
  const [trade, setTrade] = useState<Trade | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [ai, setAi] = useState<{ pass: boolean; confidence: number } | null>(null);

  async function call(path: string, body?: unknown) {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`${GATEWAY}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body || {}) });
      const d = await res.json();
      if (d.ai) setAi(d.ai);
      if (d.id) setTrade(d);
      else if (d.error) setMsg(`✗ ${d.error}`);
      return d;
    } catch {
      setMsg("✗ Pack-N-Ship service unavailable");
    } finally {
      setBusy(false);
    }
  }

  async function start() {
    setAi(null);
    await call("/api/trades", { assetId: `ast_${Date.now().toString(36)}`, sellerId: "seller_ava", buyerId: "buyer_max", priceCents: 4200000 });
  }

  const s = trade?.state;
  const nextAction =
    s === "listed" ? { label: "Buyer pays → Escrow", path: "pay" } :
    s === "paid_escrow" ? { label: "Seller packages (COA)", path: "package" } :
    s === "packaged" ? { label: "Ship (COA + tracking)", path: "ship" } :
    s === "in_transit" || s === "shipped" ? { label: "Mark delivered", path: "delivered" } :
    s === "delivered" || s === "authenticating" ? { label: "🔍 Buyer authenticates (live AI)", path: "authenticate" } :
    null;

  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      <SectionTag>CrownX Authentication · Pack-N-Ship</SectionTag>
      <h1 style={{ fontFamily: font.display, fontWeight: 400, fontSize: 44, margin: "0 0 4px" }}>Escrow-gated, COA-gated trades.</h1>
      <p style={{ color: color.mut, maxWidth: 640, marginTop: 0 }}>
        Buyer pays into escrow. Seller packages and ships with a COA at each step. On delivery the buyer re-authenticates
        the item with live AI image auth — only then does the <b style={{ color: color.cyanHi }}>Genesis COA release</b> and
        <b style={{ color: color.goldHi }}> funds release</b> to the seller. Every step is anchored on-chain.
      </p>

      {!trade ? (
        <Panel glow style={{ marginTop: 16 }}>
          <p style={{ color: color.mut, margin: "0 0 14px" }}>Run a live trade — a $42,000 game-worn jersey, seller → buyer.</p>
          <button onClick={start} disabled={busy} style={buttonStyle("primary")}>Start a trade →</button>
        </Panel>
      ) : (
        <>
          {/* pipeline */}
          <Panel style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 6, flexWrap: "wrap" }}>
              {PIPELINE.map((p, i) => {
                const on = reached(trade.state, p.key);
                const released = trade.state === "released";
                const active = (released && p.key === "released") || trade.state === p.key;
                return (
                  <div key={p.key} style={{ flex: 1, minWidth: 80, textAlign: "center", position: "relative" }}>
                    <div style={{ width: 40, height: 40, margin: "0 auto", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, background: on ? `linear-gradient(135deg,${color.cyanHi},${color.cyanDk})` : "rgba(255,255,255,0.04)", border: `1px solid ${active ? color.cyanHi : on ? color.cyanDk : color.line2}`, boxShadow: active ? "0 0 16px rgba(63,217,212,0.5)" : "none", opacity: on ? 1 : 0.5 }}>{p.icon}</div>
                    <div style={{ fontFamily: font.mono, fontSize: 8.5, letterSpacing: "0.04em", color: on ? color.txt : color.mut2, marginTop: 6, textTransform: "uppercase" }}>{p.label}</div>
                    {i < PIPELINE.length - 1 && <div style={{ position: "absolute", top: 20, right: -3, width: "100%", height: 1, background: on ? color.cyanDk : color.line, zIndex: -1 }} />}
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 18 }}>
              <Badge tone="mut">{trade.state.replace(/_/g, " ")}</Badge>
              <Badge tone="cyan">Escrow {trade.escrowDisplay}</Badge>
              {trade.tracking && <Badge tone="win">{trade.tracking.carrier} {trade.tracking.number} · {trade.tracking.status}</Badge>}
              {trade.coaReleased && <Badge tone="gold">Genesis COA {trade.genesisCoa}</Badge>}
              {trade.fundsReleased && <Badge tone="win">Funds released ✓</Badge>}
            </div>

            {ai && (
              <div style={{ marginTop: 12, fontFamily: font.mono, fontSize: 12, color: ai.pass ? color.win : color.hot }}>
                Live AI image auth: confidence {ai.confidence} {ai.pass ? "✓ gate passed" : "✗ below gate → investigation"}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
              {nextAction && <button onClick={() => call(`/api/trades/${trade.id}/${nextAction.path}`)} disabled={busy} style={buttonStyle("primary")}>{nextAction.label}</button>}
              {(trade.state === "delivered" || trade.state === "investigating") && !trade.fundsReleased && (
                <button onClick={() => call(`/api/trades/${trade.id}/investigate`)} disabled={busy} style={buttonStyle("secondary")}>No response → investigate</button>
              )}
              <button onClick={start} disabled={busy} style={{ ...buttonStyle("secondary"), fontSize: 13 }}>New trade</button>
            </div>
            {msg && <div style={{ fontFamily: font.mono, fontSize: 11, color: color.hot, marginTop: 10 }}>{msg}</div>}
          </Panel>

          {/* on-chain step ledger */}
          <Panel style={{ marginTop: 16 }}>
            <SectionTag>On-chain step ledger</SectionTag>
            <div style={{ display: "grid", gap: 6 }}>
              {trade.steps.map((st, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", border: `1px solid ${color.line}`, borderRadius: 9, background: "rgba(255,255,255,0.02)" }}>
                  <div>
                    <span style={{ fontSize: 12.5, color: color.txt }}>{st.state.replace(/_/g, " ")}</span>
                    {st.note && <span style={{ fontSize: 11, color: color.mut, display: "block" }}>{st.note}</span>}
                  </div>
                  <span style={{ fontFamily: font.mono, fontSize: 9, color: color.cyan }}>{st.tx.slice(0, 18)}…</span>
                </div>
              ))}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
