"use client";

import { useEffect, useState, useCallback } from "react";
import { SectionTag, Badge, buttonStyle, color, font } from "@crownx-jewel/shared-design";

const GATEWAY = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000";

function sub(): string {
  if (typeof document === "undefined") return "guest";
  const m = document.cookie.match(/cx_access=([^;]+)/);
  try {
    return m ? (JSON.parse(atob(m[1].split(".")[1])).sub as string) : "guest";
  } catch {
    return "guest";
  }
}

type Level = { priceCents: number; priceDisplay: string; shares: number };
type Book = { bids: Level[]; asks: Level[]; lastTradeDisplay: string | null };
type Fill = { shares: number; priceDisplay: string; buyerId: string; sellerId: string };

/** Peer-to-peer fractional order book — fans trade held shares. */
export function OrderBook({ athleteId, priceCents }: { athleteId: string; priceCents: number }) {
  const [book, setBook] = useState<Book | null>(null);
  const [fills, setFills] = useState<Fill[]>([]);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [shares, setShares] = useState(100);
  const [price, setPrice] = useState((priceCents / 100).toFixed(2));
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [b, f] = await Promise.all([
        fetch(`${GATEWAY}/api/athletes/${athleteId}/orderbook`).then((r) => r.json()),
        fetch(`${GATEWAY}/api/athletes/${athleteId}/fills`).then((r) => r.json())
      ]);
      setBook(b);
      setFills(Array.isArray(f) ? f : []);
    } catch {
      /* offline */
    }
  }, [athleteId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function place() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`${GATEWAY}/api/athletes/${athleteId}/orders`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: sub(), side, shares, limitPriceCents: Math.round(parseFloat(price) * 100) })
      });
      const d = await res.json();
      if (!res.ok) setMsg(`✗ ${d.error}${d.available != null ? ` (${d.available} available)` : ""}`);
      else setMsg(d.fills.length ? `✓ ${side} matched ${d.fills.reduce((s: number, f: { shares: number }) => s + f.shares, 0)} shares · last ${d.lastTradeDisplay}` : `✓ ${side} order resting on the book`);
      await refresh();
    } catch {
      setMsg("✗ Exchange unavailable");
    } finally {
      setBusy(false);
    }
  }

  const cell: React.CSSProperties = { fontFamily: font.mono, fontSize: 12, padding: "3px 0" };

  return (
    <div>
      <SectionTag>Trade with fans — order book</SectionTag>
      {book?.lastTradeDisplay && <div style={{ fontFamily: font.mono, fontSize: 11, color: color.mut, marginBottom: 8 }}>Last trade {book.lastTradeDisplay}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <div style={{ fontFamily: font.mono, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: color.win, marginBottom: 4 }}>Bids</div>
          {(book?.bids || []).slice(0, 6).map((l, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", ...cell }}><span style={{ color: color.win }}>{l.priceDisplay}</span><span style={{ color: color.mut }}>{l.shares.toLocaleString()}</span></div>
          ))}
          {!book?.bids.length && <div style={{ ...cell, color: color.mut2 }}>—</div>}
        </div>
        <div>
          <div style={{ fontFamily: font.mono, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: color.hot, marginBottom: 4 }}>Asks</div>
          {(book?.asks || []).slice(0, 6).map((l, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", ...cell }}><span style={{ color: color.hot }}>{l.priceDisplay}</span><span style={{ color: color.mut }}>{l.shares.toLocaleString()}</span></div>
          ))}
          {!book?.asks.length && <div style={{ ...cell, color: color.mut2 }}>—</div>}
        </div>
      </div>

      {/* place order */}
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        {(["buy", "sell"] as const).map((sd) => (
          <button key={sd} onClick={() => setSide(sd)} style={{ flex: 1, padding: "8px", borderRadius: 9, border: `1px solid ${side === sd ? (sd === "buy" ? color.win : color.hot) : color.line}`, background: side === sd ? (sd === "buy" ? "rgba(55,211,154,0.1)" : "rgba(255,77,109,0.1)") : "transparent", color: side === sd ? (sd === "buy" ? color.win : color.hot) : color.mut, fontFamily: font.mono, fontSize: 11, textTransform: "uppercase", cursor: "pointer" }}>{sd}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input type="number" value={shares} onChange={(e) => setShares(Math.max(1, +e.target.value))} placeholder="shares" style={inp} />
        <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="limit $" style={inp} />
      </div>
      <button onClick={place} disabled={busy} style={{ ...buttonStyle(side === "buy" ? "primary" : "gold"), width: "100%", marginTop: 8 }}>
        {busy ? "…" : `Place ${side} order · ${shares.toLocaleString()} @ $${price}`}
      </button>
      {msg && <div style={{ fontFamily: font.mono, fontSize: 11, color: msg.startsWith("✓") ? color.win : color.hot, marginTop: 8 }}>{msg}</div>}

      {fills.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontFamily: font.mono, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: color.mut, marginBottom: 6 }}>Recent fills</div>
          {fills.slice(0, 4).map((f, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontFamily: font.mono, fontSize: 11, color: color.mut, padding: "2px 0" }}>
              <span>{f.shares.toLocaleString()} @ {f.priceDisplay}</span>
              <span style={{ color: color.mut2 }}>{f.sellerId.slice(0, 5)}→{f.buyerId.slice(0, 5)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const inp: React.CSSProperties = { flex: 1, background: "rgba(255,255,255,0.05)", color: color.txt, border: `1px solid ${color.line2}`, padding: "9px 11px", borderRadius: 9, fontSize: 13, fontFamily: font.mono };
