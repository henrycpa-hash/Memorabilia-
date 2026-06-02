/**
 * CrownX × Jewel — Shared UI primitives.
 *
 * Server-component-safe (no hooks, no "use client") so they render in SSR
 * pages. Every value comes from tokens.ts — no hardcoded colours here.
 * Interactive surfaces (biometric login, mint reveal, live LV99) live in the
 * apps as client components and consume these tokens directly.
 */
import type { CSSProperties, ReactNode } from "react";
import { color, font, radius, gradient, shadow } from "./tokens";

/* ------------------------------------------------------------------ Crown */

/** The CrownX crest — a crown whose centre jewel forms the "X" mark. */
export function Crown({ size = 40, glow = true }: { size?: number; glow?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="CrownX"
      style={glow ? { filter: "drop-shadow(0 4px 18px rgba(63,217,212,0.45))" } : undefined}
    >
      <defs>
        <linearGradient id="cxCrown" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color.cyanHi} />
          <stop offset="0.55" stopColor={color.cyan} />
          <stop offset="1" stopColor={color.cyanDk} />
        </linearGradient>
        <linearGradient id="cxJewel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={color.goldHi} />
          <stop offset="1" stopColor={color.gold} />
        </linearGradient>
      </defs>
      {/* crown body */}
      <path
        d="M6 22l11 9 12-19 4 19 12-9-4 28H10L6 22z"
        fill="url(#cxCrown)"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {/* base band */}
      <rect x="9" y="50" width="46" height="6" rx="2" fill="url(#cxCrown)" opacity="0.85" />
      {/* centre jewel X */}
      <path
        d="M27 27l5 6 5-6M27 39l5-6 5 6"
        stroke="url(#cxJewel)"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/** Brand wordmark — "Crown" + accented "X". */
export function Brand({ size = 20, sub }: { size?: number; sub?: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <Crown size={size * 1.5} />
      <span style={{ display: "inline-flex", flexDirection: "column", lineHeight: 1 }}>
        <span style={{ fontFamily: font.display, fontSize: size, letterSpacing: "0.04em", color: color.txt }}>
          CROWN<span style={{ color: color.cyanHi }}>X</span>
        </span>
        {sub && (
          <span style={{ fontFamily: font.mono, fontSize: size * 0.42, letterSpacing: "0.22em", color: color.mut, textTransform: "uppercase", marginTop: 3 }}>
            {sub}
          </span>
        )}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ Shell */

export interface NavItem {
  href: string;
  label: string;
}

/**
 * The global CrownX shell: sticky blurred nav with the crest + a centred
 * content column. Pass `LinkComponent` (e.g. next/link) so routing stays
 * native to the host app; falls back to <a>.
 */
export function AppShell({
  brandHref = "/",
  brandSub,
  nav = [],
  actions,
  children,
  maxWidth = 1080,
  LinkComponent
}: {
  brandHref?: string;
  brandSub?: string;
  nav?: NavItem[];
  actions?: ReactNode;
  children: ReactNode;
  maxWidth?: number;
  LinkComponent?: React.ElementType;
}) {
  const L = LinkComponent || "a";
  return (
    <>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          backdropFilter: "blur(16px)",
          background: "rgba(4,6,13,0.7)",
          borderBottom: `1px solid ${color.line}`
        }}
      >
        <div
          style={{
            maxWidth,
            margin: "0 auto",
            padding: "13px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16
          }}
        >
          <L href={brandHref} style={{ textDecoration: "none" }}>
            <Brand size={19} sub={brandSub} />
          </L>
          <nav style={{ display: "flex", alignItems: "center", gap: 22, flexWrap: "wrap" }}>
            {nav.map((n) => (
              <L
                key={n.href}
                href={n.href}
                style={{ color: color.mut, fontSize: 13, fontFamily: font.mono, letterSpacing: "0.06em", textDecoration: "none" }}
              >
                {n.label}
              </L>
            ))}
            {actions}
          </nav>
        </div>
      </header>
      <main style={{ maxWidth, margin: "0 auto", padding: "28px 24px 80px" }}>{children}</main>
    </>
  );
}

/* --------------------------------------------------------------- Surfaces */

export function Panel({ children, glow = false, style }: { children: ReactNode; glow?: boolean; style?: CSSProperties }) {
  return (
    <div
      style={{
        background: gradient.panel,
        border: `1px solid ${color.line}`,
        borderRadius: radius.lg,
        padding: 22,
        position: "relative",
        overflow: "hidden",
        ...style
      }}
    >
      {glow && (
        <span
          style={{
            position: "absolute",
            top: "-40%",
            right: "-30%",
            width: 180,
            height: 180,
            background: "radial-gradient(circle, rgba(63,217,212,0.16), transparent 70%)",
            filter: "blur(6px)",
            pointerEvents: "none"
          }}
        />
      )}
      <div style={{ position: "relative" }}>{children}</div>
    </div>
  );
}

export function SectionTag({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontFamily: font.mono,
        fontSize: 10,
        letterSpacing: "0.3em",
        textTransform: "uppercase",
        color: color.cyan,
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 8
      }}
    >
      <span style={{ width: 24, height: 1, background: `linear-gradient(90deg, ${color.cyan}, transparent)` }} />
      {children}
    </div>
  );
}

export function Stat({ label, value, tone = "cyan" }: { label: string; value: ReactNode; tone?: "cyan" | "gold" | "win" | "hot" }) {
  const toneColor = { cyan: color.cyanHi, gold: color.goldHi, win: color.win, hot: color.hot }[tone];
  return (
    <div
      style={{
        background: gradient.panel,
        border: `1px solid ${color.line}`,
        borderRadius: radius.md,
        padding: 16
      }}
    >
      <div style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: color.mut }}>{label}</div>
      <div style={{ fontFamily: font.display, fontSize: 34, lineHeight: 0.9, marginTop: 8, color: toneColor }}>{value}</div>
    </div>
  );
}

export function Badge({ children, tone = "cyan" }: { children: ReactNode; tone?: "cyan" | "gold" | "win" | "hot" | "mut" }) {
  const map = {
    cyan: { c: color.cyanHi, b: "rgba(63,217,212,0.35)", bg: "rgba(63,217,212,0.08)" },
    gold: { c: color.goldHi, b: "rgba(217,168,46,0.4)", bg: "rgba(217,168,46,0.07)" },
    win: { c: color.win, b: "rgba(55,211,154,0.4)", bg: "rgba(55,211,154,0.08)" },
    hot: { c: color.hot, b: "rgba(255,77,109,0.4)", bg: "rgba(255,77,109,0.08)" },
    mut: { c: color.mut, b: color.line2, bg: "rgba(255,255,255,0.03)" }
  }[tone];
  return (
    <span
      style={{
        fontFamily: font.mono,
        fontSize: 10,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: map.c,
        border: `1px solid ${map.b}`,
        background: map.bg,
        borderRadius: radius.pill,
        padding: "4px 10px",
        whiteSpace: "nowrap"
      }}
    >
      {children}
    </span>
  );
}

/* ---------------------------------------------------------------- Buttons */

const buttonBase: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  border: "none",
  borderRadius: radius.md,
  fontWeight: 700,
  fontSize: 15,
  cursor: "pointer",
  padding: "13px 22px",
  textDecoration: "none",
  transition: "transform .1s ease"
};

export function buttonStyle(variant: "primary" | "secondary" | "gold" = "primary"): CSSProperties {
  if (variant === "secondary") {
    return { ...buttonBase, background: "rgba(255,255,255,0.05)", border: `1px solid ${color.line2}`, color: color.txt };
  }
  if (variant === "gold") {
    return { ...buttonBase, background: `linear-gradient(100deg, ${color.goldHi}, ${color.goldDeep})`, color: "#1a1204", boxShadow: shadow.goldGlow };
  }
  return { ...buttonBase, background: gradient.cyanAction, color: color.void, boxShadow: shadow.cyanGlow };
}

/** Anchor styled as a CrownX button (works in SSR; pass `as` for next/link). */
export function ButtonLink({
  href,
  children,
  variant = "primary",
  as: As = "a",
  style
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "gold";
  as?: React.ElementType;
  style?: CSSProperties;
}) {
  return (
    <As href={href} style={{ ...buttonStyle(variant), ...style }}>
      {children}
    </As>
  );
}

/* ----------------------------------------------------------- /LV99 ring */

/** The status ring used on profiles + the feed. `pct` 0–100 fills the arc. */
export function LevelRing({ level, tier, pct = 72, size = 62 }: { level: number; tier?: string; pct?: number; size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div
        style={{
          width: size,
          height: size,
          flex: "none",
          borderRadius: "50%",
          position: "relative",
          background: `conic-gradient(${color.cyan} 0% ${pct}%, rgba(255,255,255,0.08) ${pct}% 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <div style={{ position: "absolute", inset: 5, borderRadius: "50%", background: color.ink }} />
        <div style={{ position: "relative", textAlign: "center" }}>
          <span style={{ fontFamily: font.display, fontSize: size * 0.42, color: color.cyanHi, lineHeight: 0.8, display: "block" }}>{level}</span>
          <small style={{ fontFamily: font.mono, fontSize: 6, letterSpacing: "0.1em", color: color.mut }}>LV99</small>
        </div>
      </div>
      {tier && (
        <div>
          <div style={{ fontFamily: font.display, fontSize: 22, letterSpacing: "0.02em" }}>{tier}</div>
          <div style={{ fontFamily: font.mono, fontSize: 9, color: color.mut, letterSpacing: "0.06em", marginTop: 2 }}>
            {pct}% to next rank
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- Sparkline */

/** Lightweight SVG sparkline for live market floors. */
export function Sparkline({ points, up = true, width = 320, height = 50 }: { points: number[]; up?: boolean; width?: number; height?: number }) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const stroke = up ? color.win : color.hot;
  const d = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - ((p - min) / span) * (height - 6) - 3;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id={`cxsp-${up ? "u" : "d"}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="1" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${width},${height} L0,${height} Z`} fill={`url(#cxsp-${up ? "u" : "d"})`} />
      <path d={d} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* --------------------------------------------------------------- SlabCard */

/** The "Living Slab" — a graded, chain-anchored collectible card. */
export function SlabCard({
  name,
  subtitle,
  grade = "9.5",
  floor,
  change,
  badge,
  href,
  as: As = "a"
}: {
  name: string;
  subtitle?: string;
  grade?: string;
  floor?: string;
  change?: string;
  badge?: string;
  href?: string;
  as?: React.ElementType;
}) {
  const up = !change || !change.trim().startsWith("-");
  const inner = (
    <div
      style={{
        borderRadius: radius.lg,
        overflow: "hidden",
        background: "linear-gradient(155deg, #10131d, #06080f 60%)",
        border: `1px solid ${color.line2}`,
        boxShadow: shadow.slab,
        display: "flex",
        flexDirection: "column",
        height: "100%"
      }}
    >
      {/* label strip */}
      <div style={{ display: "flex", gap: 8, padding: "9px 10px", background: "linear-gradient(180deg,#fafbff,#e7e9f0)", color: "#10131f" }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            flex: "none",
            background: gradient.holo,
            boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <span style={{ fontFamily: font.display, fontSize: 20, color: "#10131f", mixBlendMode: "overlay" }}>X</span>
        </div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontFamily: font.display, fontSize: 16, letterSpacing: "0.02em", lineHeight: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
          {subtitle && <div style={{ fontFamily: font.mono, fontSize: 8, letterSpacing: "0.1em", background: "#10131f", color: "#fff", padding: "2px 5px", borderRadius: 3, width: "fit-content", marginTop: 3 }}>{subtitle}</div>}
        </div>
        <div style={{ flex: "none", textAlign: "center", borderLeft: "1px solid rgba(0,0,0,0.12)", paddingLeft: 9, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontFamily: font.display, fontSize: 28, lineHeight: 0.8, background: gradient.holo, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{grade}</div>
          <div style={{ fontFamily: font.mono, fontSize: 7, letterSpacing: "0.12em", color: "#10131f" }}>GENESIS</div>
        </div>
      </div>
      {/* cyan band */}
      <div style={{ background: "linear-gradient(100deg,#0a2c34,#05100f)", padding: "7px 10px", borderTop: `2px solid ${color.cyan}` }}>
        {badge && <div style={{ fontFamily: font.mono, fontSize: 8, letterSpacing: "0.12em", color: color.cyanHi, textTransform: "uppercase" }}>{badge}</div>}
        <div style={{ fontFamily: font.mono, fontSize: 6.5, letterSpacing: "0.08em", color: "#a9d9d6", marginTop: 2 }}>CHAIN-ANCHORED · COA VERIFIED</div>
      </div>
      {/* footer market */}
      {(floor || change) && (
        <div style={{ background: "linear-gradient(180deg,#080b11,#05070e)", padding: "10px 12px", borderTop: `1px solid rgba(63,217,212,0.3)`, display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "auto" }}>
          <div>
            <div style={{ fontFamily: font.mono, fontSize: 7, letterSpacing: "0.1em", color: color.mut, textTransform: "uppercase" }}>Floor</div>
            <div style={{ fontFamily: font.display, fontSize: 22, color: color.cyanHi, lineHeight: 0.9 }}>{floor || "—"}</div>
          </div>
          {change && <div style={{ fontFamily: font.mono, fontSize: 12, fontWeight: 600, color: up ? color.win : color.hot }}>{change}</div>}
        </div>
      )}
    </div>
  );
  return href ? (
    <As href={href} style={{ textDecoration: "none", color: "inherit", display: "block", height: "100%" }}>
      {inner}
    </As>
  ) : (
    inner
  );
}

/* --------------------------------------------------------------- Feed */

export interface FeedEvent {
  id: string;
  actor: string;
  level?: number;
  /** "mint" | "level" | "royalty" | "floor" | "drop" — drives the accent. */
  kind: "mint" | "level" | "royalty" | "floor" | "drop";
  text: ReactNode;
  meta?: string;
}

const kindAccent: Record<FeedEvent["kind"], string> = {
  mint: color.cyanHi,
  level: color.cyan,
  royalty: color.goldHi,
  floor: color.win,
  drop: color.hot
};

export function ActivityFeed({ events }: { events: FeedEvent[] }) {
  return (
    <div>
      {events.map((e) => (
        <div key={e.id} style={{ display: "flex", gap: 11, padding: "13px 0", borderBottom: `1px solid ${color.line}` }}>
          <div style={{ width: 38, height: 38, borderRadius: "50%", flex: "none", position: "relative", background: "linear-gradient(135deg,#21283c,#10131f)", border: `1px solid ${color.line2}` }}>
            {e.level != null && (
              <span style={{ position: "absolute", bottom: -3, right: -3, fontFamily: font.mono, fontSize: 7, fontWeight: 600, background: color.cyan, color: color.void, borderRadius: 5, padding: "1px 3px", border: `1px solid ${color.void}` }}>
                {e.level}
              </span>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, color: color.txt }}>
              <b style={{ color: kindAccent[e.kind], fontWeight: 600 }}>{e.actor}</b> {e.text}
            </div>
            {e.meta && <div style={{ fontFamily: font.mono, fontSize: 9, color: color.mut2, marginTop: 3, letterSpacing: "0.06em" }}>{e.meta}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- Hero */

export function Hero({ kicker, title, lead, actions }: { kicker?: string; title: ReactNode; lead?: ReactNode; actions?: ReactNode }) {
  return (
    <section style={{ textAlign: "center", padding: "48px 0 30px" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
        <Crown size={64} />
      </div>
      {kicker && <div style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: "0.4em", textTransform: "uppercase", color: color.cyan, marginBottom: 14 }}>{kicker}</div>}
      <h1
        style={{
          fontFamily: font.display,
          fontWeight: 400,
          lineHeight: 0.9,
          fontSize: "clamp(44px, 9vw, 96px)",
          margin: 0,
          background: gradient.headline,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent"
        }}
      >
        {title}
      </h1>
      {lead && <p style={{ color: color.mut, fontSize: 16, maxWidth: 620, margin: "18px auto 0" }}>{lead}</p>}
      {actions && <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 30, flexWrap: "wrap" }}>{actions}</div>}
    </section>
  );
}
