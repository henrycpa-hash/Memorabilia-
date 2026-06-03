"use client";

import { useState } from "react";
import { buttonStyle, color, font } from "@crownx-jewel/shared-design";

/**
 * Viral share for a Genesis COA — native share sheet (mobile / headset browser)
 * with layered copy-link fallbacks. The /coa/:id route is public, so the shared
 * link opens the full 3D/4D + AR/VR viewer for anyone.
 *
 * Clipboard access can be denied (insecure context, sandboxed iframe, no user
 * permission), so every path is guarded and we fall back to an inline,
 * select-all link the user can copy by hand — no unhandled rejections.
 */
export function ShareCoa({ id, title, shareUrl }: { id: string; title: string; shareUrl?: string }) {
  const [state, setState] = useState<"idle" | "copied">("idle");
  const [manual, setManual] = useState<string | null>(null);

  async function copyToClipboard(url: string): Promise<boolean> {
    // 1) async Clipboard API (may reject in iframes / insecure contexts)
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
        return true;
      }
    } catch { /* fall through */ }
    // 2) legacy execCommand('copy') via a hidden textarea (works in more frames)
    try {
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      ta.style.pointerEvents = "none";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      if (ok) return true;
    } catch { /* fall through */ }
    return false;
  }

  async function share() {
    const url = typeof window !== "undefined" ? `${window.location.origin}/coa/${id}` : shareUrl || `/coa/${id}`;
    // native share first (best on mobile + headset browsers)
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ title: `${title} — CrownX Genesis COA`, text: "View this authenticated collectible in 3D/4D + AR/VR on CrownX.", url });
        return;
      } catch { /* user dismissed or unsupported — fall back to copy */ }
    }
    const copied = await copyToClipboard(url);
    if (copied) {
      setState("copied");
      setManual(null);
      setTimeout(() => setState("idle"), 1800);
    } else {
      // 3) last resort: reveal the link inline for manual copy
      setManual(url);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
      <button onClick={share} style={{ ...buttonStyle("gold"), padding: "9px 16px", fontSize: 13 }}>
        {state === "copied" ? "Link copied ✓" : "↗ Share COA"}
        <span style={{ fontFamily: font.mono, fontSize: 9, color: "rgba(4,8,12,0.6)", marginLeft: 8 }}>3D · AR/VR</span>
      </button>
      {manual && (
        <input
          readOnly
          value={manual}
          onFocus={(e) => e.currentTarget.select()}
          onClick={(e) => e.currentTarget.select()}
          aria-label="Shareable COA link"
          style={{ width: 280, fontFamily: font.mono, fontSize: 10, color: color.cyanHi, background: color.ink, border: `1px solid ${color.line2}`, borderRadius: 8, padding: "7px 9px" }}
        />
      )}
    </div>
  );
}
