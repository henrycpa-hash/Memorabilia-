"use client";

import { useState } from "react";
import { buttonStyle } from "@crownx-jewel/shared-design";

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

/** Share an athlete's index card — mints an attribution render_id (viral loop). */
export function ShareAthlete({ athleteId, name, team, priceDisplay, brandScore }: { athleteId: string; name: string; team: string; priceDisplay: string; brandScore: number }) {
  const [label, setLabel] = useState("↗ Share index");

  async function share() {
    setLabel("…");
    try {
      const res = await fetch(`${GATEWAY}/api/renders`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          assetId: `idx_${athleteId}`,
          sharerId: sub(),
          sharerLv: Math.round(brandScore),
          surface: "link",
          card: { name, title: team, grade: "INDEX", edition: "LIVE", floor: priceDisplay, lv: String(Math.round(brandScore)) }
        })
      });
      const d = await res.json();
      const url = d.shareUrl as string | undefined;
      const text = `${name} is live on the CrownX Athlete Exchange at ${priceDisplay}/share 📈 own a piece 👑`;
      const navAny = navigator as Navigator & { share?: (d: unknown) => Promise<void> };
      if (url && navAny.share) {
        await navAny.share({ title: "CrownX Athlete Exchange", text, url });
        setLabel("✓ Shared");
      } else if (url) {
        await navigator.clipboard?.writeText(`${text} ${url}`);
        setLabel("✓ Link copied");
      } else {
        setLabel("↗ Share index");
      }
    } catch {
      setLabel("↗ Share index");
    }
  }

  return (
    <button onClick={share} style={{ ...buttonStyle("secondary"), padding: "9px 16px", fontSize: 13 }}>
      {label}
    </button>
  );
}
