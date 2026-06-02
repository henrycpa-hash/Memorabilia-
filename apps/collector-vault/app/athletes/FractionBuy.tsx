"use client";

import { useState } from "react";
import { color, font, buttonStyle, Badge } from "@crownx-jewel/shared-design";

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

/** Buy fractional shares of an athlete — anyone can own a piece. */
export function FractionBuy({ athleteId, priceCents, available }: { athleteId: string; priceCents: number; available: number }) {
  const [shares, setShares] = useState(100);
  const [msg, setMsg] = useState("");
  const [tone, setTone] = useState<"win" | "hot">("win");
  const [busy, setBusy] = useState(false);

  const costCents = shares * priceCents;
  const costDisplay = costCents >= 100_000 ? `$${(costCents / 100_000).toFixed(1)}K` : `$${(costCents / 100).toFixed(2)}`;

  async function buy() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`${GATEWAY}/api/athletes/${athleteId}/fractions/buy`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: sub(), shares })
      });
      const d = await res.json();
      if (res.ok) {
        setTone("win");
        setMsg(`✓ You own ${d.holding.shares.toLocaleString()} shares (cost ${d.costDisplay}). Refresh to see the ticker move.`);
      } else {
        setTone("hot");
        setMsg(`✗ ${d.error}${d.available != null ? ` (only ${d.available.toLocaleString()} left)` : ""}`);
      }
    } catch {
      setTone("hot");
      setMsg("✗ Exchange unavailable");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <span style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: color.mut }}>Buy fractional shares</span>
        <Badge tone="mut">{available.toLocaleString()} available</Badge>
      </div>
      <input type="range" min={1} max={Math.max(1, Math.min(available, 5000))} value={shares} onChange={(e) => setShares(+e.target.value)} style={{ width: "100%", accentColor: color.cyan }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 8 }}>
        <span style={{ fontFamily: font.display, fontSize: 26, color: color.cyanHi }}>{shares.toLocaleString()} <span style={{ fontSize: 13, color: color.mut }}>shares</span></span>
        <span style={{ fontFamily: font.display, fontSize: 22, color: color.goldHi }}>{costDisplay}</span>
      </div>
      <button onClick={buy} disabled={busy} style={{ ...buttonStyle("primary"), width: "100%", marginTop: 12 }}>
        {busy ? "…" : "Buy a piece →"}
      </button>
      {msg && <div style={{ fontFamily: font.mono, fontSize: 11, color: tone === "win" ? color.win : color.hot, marginTop: 10 }}>{msg}</div>}
    </div>
  );
}
