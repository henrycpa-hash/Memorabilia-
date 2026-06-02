"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkline, color, font } from "@crownx-jewel/shared-design";

/**
 * Live market floor with a self-animating sparkline. In production this binds
 * to the Jewel asset price / order stream (semantic-metrics + marketplace
 * services); here it simulates the tick so the surface is alive on first load.
 * Pricing/fee logic is never computed here — this is a read-only display.
 */
export function LiveFloor({
  label = "VAULT FLOOR INDEX",
  start = 1240,
  feedUrl
}: {
  label?: string;
  start?: number;
  feedUrl?: string;
}) {
  const [series, setSeries] = useState<number[]>(() =>
    Array.from({ length: 28 }, (_, i) => start + Math.sin(i / 3) * 24 + i * 1.5)
  );
  const seedRef = useRef(start);

  useEffect(() => {
    let alive = true;
    async function pull() {
      if (!feedUrl) return false;
      try {
        const res = await fetch(feedUrl, { cache: "no-store" });
        if (!res.ok) return false;
        const data = (await res.json()) as { points?: number[] };
        if (alive && Array.isArray(data.points) && data.points.length > 1) {
          setSeries(data.points.slice(-28));
          return true;
        }
      } catch {
        /* fall back to simulated tick */
      }
      return false;
    }
    const id = setInterval(async () => {
      const live = await pull();
      if (live) return;
      setSeries((prev) => {
        const last = prev[prev.length - 1] ?? seedRef.current;
        const next = Math.max(50, last + (Math.random() - 0.46) * 28);
        return [...prev.slice(-27), next];
      });
    }, 1800);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [feedUrl]);

  const first = series[0];
  const last = series[series.length - 1];
  const up = last >= first;
  const pct = (((last - first) / first) * 100).toFixed(1);

  return (
    <div
      style={{
        background: color.ink,
        border: `1px solid ${color.line}`,
        borderRadius: 16,
        padding: 20,
        position: "relative",
        overflow: "hidden"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: font.mono, fontSize: 10, letterSpacing: "0.1em", color: color.win, textTransform: "uppercase" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: color.win, boxShadow: `0 0 8px ${color.win}`, animation: "cx-pulse 1.6s infinite" }} />
          Live · {label}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span style={{ fontFamily: font.display, fontSize: 42, lineHeight: 0.9, color: color.txt }}>
          {Math.round(last).toLocaleString()}
        </span>
        <span style={{ fontFamily: font.mono, fontSize: 13, fontWeight: 600, color: up ? color.win : color.hot }}>
          {up ? "▲" : "▼"} {up ? "+" : ""}
          {pct}%
        </span>
      </div>
      <div style={{ marginTop: 8 }}>
        <Sparkline points={series} up={up} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontFamily: font.mono, fontSize: 9.5, color: color.mut, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        <span>24h low <b style={{ color: color.txt }}>{Math.round(Math.min(...series)).toLocaleString()}</b></span>
        <span>24h high <b style={{ color: color.txt }}>{Math.round(Math.max(...series)).toLocaleString()}</b></span>
      </div>
    </div>
  );
}
