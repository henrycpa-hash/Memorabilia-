"use client";

import { useState } from "react";
import { buttonStyle, color, font } from "@crownx-jewel/shared-design";

/**
 * Viral share for a Genesis COA — native share sheet (mobile / headset browser)
 * with copy-link fallback. The /coa/:id route is public, so the shared link
 * opens the full 3D/4D + AR/VR viewer for anyone.
 */
export function ShareCoa({ id, title, shareUrl }: { id: string; title: string; shareUrl?: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = typeof window !== "undefined" ? `${window.location.origin}/coa/${id}` : shareUrl || `/coa/${id}`;
    const payload = { title: `${title} — CrownX Genesis COA`, text: "View this authenticated collectible in 3D/4D + AR/VR on CrownX.", url };
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) {
      try { await nav.share(payload); return; } catch { /* fall through to copy */ }
    }
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* ignore */ }
  }

  return (
    <button onClick={share} style={{ ...buttonStyle("gold"), padding: "9px 16px", fontSize: 13 }}>
      {copied ? "Link copied ✓" : "↗ Share COA"}
      <span style={{ fontFamily: font.mono, fontSize: 9, color: "rgba(4,8,12,0.6)", marginLeft: 8 }}>3D · AR/VR</span>
    </button>
  );
}
