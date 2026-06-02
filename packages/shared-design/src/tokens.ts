/**
 * CrownX × Jewel — Design Tokens (single source of truth)
 *
 * Ported from the canonical reference `crownx-vault-v2.html`. These are the
 * ONLY colour / type / radius / shadow values any surface should consume.
 * Inline-style consumers import `tokens`; CSS consumers use the matching
 * CSS custom properties declared in `theme.css` (names kept 1:1, e.g.
 * tokens.color.cyan === var(--cx-cyan)).
 *
 * Dark-first · cyan dominant · gold accent · holo on reveals.
 */

export const color = {
  // surfaces (deep → raised)
  void: "#04060d",
  void2: "#070a14",
  ink: "#0c1120",
  ink2: "#111a30",
  panel: "#121c30",
  deep: "#0a2540",

  // hairlines
  line: "rgba(255,255,255,0.08)",
  line2: "rgba(255,255,255,0.15)",

  // brand — cyan dominant
  cyan: "#3fd9d4",
  cyanHi: "#8ff5f1",
  cyanDk: "#1c6f6b",

  // brand — gold accent
  gold: "#d9a82e",
  goldHi: "#f7e08a",
  goldDeep: "#8a6310",

  // neutrals
  plat: "#cfd6e6",
  txt: "#eef1f8",
  mut: "#7d869c",
  mut2: "#4d5468",

  // signal
  win: "#37d39a",
  hot: "#ff4d6d"
} as const;

export const font = {
  display: "'Bebas Neue', Georgia, 'Times New Roman', serif",
  body: "'Sora', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  mono: "'Azeret Mono', ui-monospace, Consolas, monospace"
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 48
} as const;

export const shadow = {
  panel: "0 30px 80px -20px rgba(0,0,0,0.7)",
  slab:
    "0 40px 80px -20px rgba(0,0,0,0.9), inset 0 0 0 1px rgba(255,255,255,0.04), inset 0 2px 1px rgba(255,255,255,0.10)",
  cyanGlow: "0 12px 34px -10px rgba(63,217,212,0.5)",
  goldGlow: "0 12px 34px -10px rgba(217,168,46,0.4)"
} as const;

export const gradient = {
  // primary cyan action (buttons, CTAs)
  cyan: `linear-gradient(100deg, ${color.cyanHi}, ${color.cyanDk})`,
  cyanAction: `linear-gradient(100deg, ${color.cyanHi}, ${color.cyan} 55%, ${color.cyanDk})`,
  // page ambient backdrop
  ambient:
    "radial-gradient(ellipse 70% 45% at 50% -8%, rgba(63,217,212,0.10), transparent 60%), radial-gradient(ellipse 60% 40% at 88% 18%, rgba(217,168,46,0.07), transparent 55%)",
  // holographic crest (rarity / reveal)
  holo:
    "conic-gradient(from 0deg, #ff9bd2, #9bb8ff, #9bffd2, #fff39b, #ff9bd2)",
  // panel face
  panel:
    "linear-gradient(165deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
  // heading shimmer (light text fill)
  headline: "linear-gradient(180deg, #fff, #bcc6da 50%, #5e6880 100%)"
} as const;

export const tokens = { color, font, radius, space, shadow, gradient } as const;

export type Tokens = typeof tokens;
export default tokens;
