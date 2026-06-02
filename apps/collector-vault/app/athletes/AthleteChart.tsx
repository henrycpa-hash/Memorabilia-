"use client";

import { useState } from "react";
import { color, font } from "@crownx-jewel/shared-design";

type Pt = { priceCents: number; event?: { kind: string; tag: string; label: string; note?: string } };

const KIND_COLOR: Record<string, string> = {
  news: "#b06cff",
  perf: "#37d39a",
  royalty: color.goldHi,
  fraction: color.cyanHi,
  signal: "#ff4d6d",
  seed: color.mut
};

/** Stock-ticker-style area chart with hoverable event annotations. */
export function AthleteChart({ points, height = 280 }: { points: Pt[]; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  if (points.length < 2) return null;
  const W = 960;
  const H = height;
  const prices = points.map((p) => p.priceCents);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;
  const x = (i: number) => (i / (points.length - 1)) * W;
  const y = (v: number) => H - 28 - ((v - min) / span) * (H - 56);
  const up = prices[prices.length - 1] >= prices[0];
  const stroke = up ? color.win : color.hot;
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.priceCents).toFixed(1)}`).join(" ");

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id="athFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={stroke} stopOpacity="0.28" />
            <stop offset="1" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${line} L${W},${H} L0,${H} Z`} fill="url(#athFill)" />
        <path d={line} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        {points.map((p, i) =>
          p.event ? (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: "pointer" }}>
              <line x1={x(i)} y1={y(p.priceCents)} x2={x(i)} y2={y(p.priceCents) - 26} stroke={KIND_COLOR[p.event.kind] || color.mut} strokeWidth="1" opacity="0.6" />
              <rect x={x(i) - 9} y={y(p.priceCents) - 44} width="18" height="18" rx="4" fill={KIND_COLOR[p.event.kind] || color.mut} />
              <text x={x(i)} y={y(p.priceCents) - 31} textAnchor="middle" fontSize="11" fontWeight="700" fill="#04060d" fontFamily="monospace">{p.event.tag}</text>
              <circle cx={x(i)} cy={y(p.priceCents)} r="3" fill={KIND_COLOR[p.event.kind] || color.mut} stroke="#04060d" strokeWidth="1" />
            </g>
          ) : null
        )}
      </svg>
      {hover != null && points[hover].event && (
        <div
          style={{
            position: "absolute",
            left: `${(hover / (points.length - 1)) * 100}%`,
            top: 8,
            transform: "translateX(-50%)",
            maxWidth: 230,
            background: color.ink,
            border: `1px solid ${KIND_COLOR[points[hover].event!.kind] || color.line2}`,
            borderRadius: 10,
            padding: "10px 12px",
            pointerEvents: "none",
            zIndex: 5
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: color.txt }}>{points[hover].event!.label}</div>
          {points[hover].event!.note && <div style={{ fontSize: 11, color: color.mut, marginTop: 4 }}>{points[hover].event!.note}</div>}
        </div>
      )}
    </div>
  );
}
