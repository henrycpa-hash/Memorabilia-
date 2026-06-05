"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ButtonLink, color, font } from "@crownx-jewel/shared-design";
import { clientSession } from "../../lib/clientAuth";
import { clearSession } from "../../lib/webauthn";

/**
 * Header auth control. Reads the client-side session (the cookie set at login)
 * so the chrome reflects the real signed-in state inside the preview iframe —
 * no more "Sign in" button while you're actually logged in.
 */
export function AuthAction() {
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const s = clientSession();
    setEmail(s?.email || null);
    setReady(true);
  }, []);

  // before hydration we don't know — render the neutral "Sign in" so SSR matches
  if (!ready || !email) {
    return (
      <ButtonLink href="/login" as={Link} variant="primary" style={{ padding: "9px 16px", fontSize: 13 }}>
        Sign in
      </ButtonLink>
    );
  }

  const handle = email.split("@")[0];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span
        title={email}
        style={{
          fontFamily: font.mono,
          fontSize: 12,
          color: color.cyanHi,
          padding: "6px 12px",
          borderRadius: 999,
          border: "1px solid rgba(63,217,212,0.3)",
          background: "rgba(63,217,212,0.08)",
          maxWidth: 160,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }}
      >
        ♛ {handle}
      </span>
      <button
        onClick={() => {
          clearSession();
          window.location.href = "/login";
        }}
        style={{
          background: "transparent",
          border: `1px solid ${color.line2}`,
          color: color.mut,
          fontFamily: font.mono,
          fontSize: 12,
          padding: "8px 12px",
          borderRadius: 10,
          cursor: "pointer"
        }}
      >
        Sign out
      </button>
    </div>
  );
}
