"use client";

import { useEffect, useState, type ReactNode } from "react";
import { color, font } from "./tokens";
import { Brand } from "./components";

export interface NavItem {
  href: string;
  label: string;
}

/**
 * The CrownX top bar + pop-out sidebar. Clicking the CrownX logo slides a fully
 * wired navigation drawer in from the left (backdrop, ESC-to-close, links route
 * through the host app's LinkComponent and close the drawer on navigate). The
 * top bar keeps the brand (as the toggle) and the action slot (e.g. Sign in).
 */
export function NavBar({
  brandHref = "/",
  brandSub,
  nav = [],
  actions,
  maxWidth = 1080,
  LinkComponent
}: {
  brandHref?: string;
  brandSub?: string;
  nav?: NavItem[];
  actions?: ReactNode;
  maxWidth?: number;
  LinkComponent?: React.ElementType;
}) {
  const L = LinkComponent || "a";
  const [open, setOpen] = useState(false);

  // ESC closes; lock body scroll while the drawer is open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open]);

  return (
    <>
      <header
        style={{
          position: "sticky", top: 0, zIndex: 100,
          backdropFilter: "blur(16px)", background: "rgba(4,6,13,0.7)",
          borderBottom: `1px solid ${color.line}`
        }}
      >
        <div style={{ maxWidth, margin: "0 auto", padding: "13px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          {/* the CrownX logo is the sidebar toggle */}
          <button
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
            aria-expanded={open}
            style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
          >
            <Brand size={19} sub={brandSub} />
            <span aria-hidden style={{ display: "inline-flex", flexDirection: "column", gap: 3, marginLeft: 4 }}>
              <span style={{ width: 16, height: 2, background: color.mut, borderRadius: 2 }} />
              <span style={{ width: 16, height: 2, background: color.mut, borderRadius: 2 }} />
              <span style={{ width: 10, height: 2, background: color.cyan, borderRadius: 2 }} />
            </span>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>{actions}</div>
        </div>
      </header>

      {/* backdrop */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden={!open}
        style={{
          position: "fixed", inset: 0, zIndex: 200, background: "rgba(2,4,9,0.62)",
          backdropFilter: "blur(3px)", opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none",
          transition: "opacity .25s ease"
        }}
      />

      {/* the pop-out sidebar */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="CrownX navigation"
        style={{
          position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 201, width: 300, maxWidth: "84vw",
          background: `linear-gradient(180deg, ${color.ink}, ${color.void})`,
          borderRight: `1px solid ${color.line2}`, boxShadow: "0 0 60px rgba(0,0,0,0.7)",
          transform: open ? "translateX(0)" : "translateX(-104%)", transition: "transform .28s cubic-bezier(.4,0,.2,1)",
          display: "flex", flexDirection: "column", padding: "20px 18px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <L href={brandHref} onClick={() => setOpen(false)} style={{ textDecoration: "none" }}>
            <Brand size={20} sub={brandSub} />
          </L>
          <button onClick={() => setOpen(false)} aria-label="Close navigation" style={{ background: "transparent", border: `1px solid ${color.line2}`, borderRadius: 9, color: color.mut, width: 32, height: 32, cursor: "pointer", fontSize: 16, lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ fontFamily: font.mono, fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: color.mut2, margin: "14px 4px 8px" }}>Navigate</div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2, overflowY: "auto", flex: 1 }}>
          {nav.map((n) => (
            <L
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", borderRadius: 11,
                color: color.txt, fontSize: 14, fontFamily: font.body, textDecoration: "none",
                border: `1px solid transparent`, transition: "background .15s, border-color .15s"
              }}
              className="cx-navlink"
            >
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: color.cyan, flex: "none" }} />
              {n.label}
            </L>
          ))}
        </nav>

        {actions && (
          <div style={{ borderTop: `1px solid ${color.line}`, paddingTop: 14, marginTop: 10 }} onClick={() => setOpen(false)}>
            {actions}
          </div>
        )}
        <div style={{ fontFamily: font.mono, fontSize: 8, letterSpacing: "0.18em", textTransform: "uppercase", color: color.mut2, marginTop: 12, textAlign: "center" }}>
          CrownX Protocol · Verify · Protect · Monetize
        </div>
      </aside>
    </>
  );
}
