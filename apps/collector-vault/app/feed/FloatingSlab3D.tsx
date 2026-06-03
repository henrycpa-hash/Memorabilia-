"use client";

import { useRef, useState } from "react";
import { color, font, gradient } from "@crownx-jewel/shared-design";

/**
 * A floating, holographic 3D/4D slab — auto-orbits, and you can grab it to spin.
 * Used for mint moments on the network feed (the collectible is the content).
 */
export function FloatingSlab3D({ name, grade = "10", floor, lv = "72", size = 150 }: { name: string; grade?: string; floor?: string; lv?: string; size?: number }) {
  const [rot, setRot] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ x: number; y: number; rx: number; ry: number } | null>(null);
  const w = size;
  const h = Math.round(size * 1.4);

  function down(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, rx: rot?.x ?? -4, ry: rot?.y ?? 0 };
  }
  function move(e: React.PointerEvent) {
    if (!drag.current) return;
    const dy = e.clientX - drag.current.x;
    const dx = e.clientY - drag.current.y;
    setRot({ x: drag.current.rx - dx * 0.4, y: drag.current.ry + dy * 0.6 });
  }
  function up() {
    drag.current = null;
  }

  const transform = rot ? `rotateX(${rot.x}deg) rotateY(${rot.y}deg)` : undefined;

  return (
    <div style={{ perspective: 1200, width: w, height: h, flex: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        style={{
          width: w,
          height: h,
          position: "relative",
          transformStyle: "preserve-3d",
          transform,
          animation: rot ? undefined : "cx-slabspin 14s cubic-bezier(.45,.05,.55,.95) infinite",
          cursor: "grab",
          touchAction: "none"
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 14,
            overflow: "hidden",
            backfaceVisibility: "hidden",
            background: "linear-gradient(155deg,#10131d,#06080f 60%)",
            border: `1px solid ${color.line2}`,
            boxShadow: "0 30px 60px -18px rgba(0,0,0,0.9), 0 0 40px rgba(63,217,212,0.18)",
            display: "flex",
            flexDirection: "column"
          }}
          className="cx-sheen"
        >
          <div style={{ display: "flex", gap: 6, padding: "7px 8px", background: "linear-gradient(180deg,#fafbff,#e7e9f0)", color: "#10131f" }}>
            <div style={{ width: 26, height: 26, borderRadius: 6, flex: "none", background: gradient.holo, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.display, fontSize: 13, color: "#10131f" }}>X</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: font.display, fontSize: 11, letterSpacing: "0.02em", lineHeight: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
              <div style={{ fontFamily: font.mono, fontSize: 6, background: "#10131f", color: "#fff", padding: "1px 4px", borderRadius: 2, width: "fit-content", marginTop: 2 }}>GENESIS</div>
            </div>
            <div style={{ fontFamily: font.display, fontSize: 20, lineHeight: 0.8, background: gradient.holo, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{grade}</div>
          </div>
          <div style={{ background: "linear-gradient(100deg,#0a2c34,#05100f)", padding: "5px 8px", borderTop: `2px solid ${color.cyan}` }}>
            <div style={{ fontFamily: font.mono, fontSize: 5.5, letterSpacing: "0.08em", color: "#a9d9d6" }}>CHAIN-ANCHORED · COA</div>
          </div>
          <div style={{ flex: 1, background: "radial-gradient(circle at 50% 30%,rgba(63,217,212,0.14),transparent 60%),linear-gradient(180deg,#0a0d13,#04060d)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
            <span style={{ fontFamily: font.display, fontSize: 40, color: "rgba(255,255,255,0.12)", marginBottom: 6 }}>27</span>
          </div>
          <div style={{ background: "linear-gradient(180deg,#080b11,#05070e)", padding: "7px 9px", borderTop: `1px solid rgba(63,217,212,0.3)`, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <div style={{ fontFamily: font.mono, fontSize: 6, color: color.mut, textTransform: "uppercase" }}>Floor</div>
              <div style={{ fontFamily: font.display, fontSize: 16, color: color.cyanHi, lineHeight: 0.9 }}>{floor || "—"}</div>
            </div>
            <div style={{ fontFamily: font.display, fontSize: 14, color: color.cyan }}>LV{lv}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
