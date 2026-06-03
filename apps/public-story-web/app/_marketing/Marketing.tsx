import Link from "next/link";
import { Crown, Panel, SectionTag, Badge, ButtonLink, color, font } from "@crownx-jewel/shared-design";

/**
 * Shared marketing surface for the conversion funnel pages (merge spec §4.2):
 * How It Works · Royalties for Life · For Creators · For Collectors · Trust.
 * Data-driven so every page shares one coherent system.
 */

export interface MarketingSection {
  tag: string;
  heading: string;
  body?: string;
  steps?: { n: string; t: string; d: string }[];
  cards?: { t: string; d: string }[];
  table?: { head: string[]; rows: string[][] };
}

export interface MarketingContent {
  kicker: string;
  title: React.ReactNode;
  lead: string;
  sections: MarketingSection[];
  cta?: { label: string; href: string };
}

export function MarketingPage({ content }: { content: MarketingContent }) {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <section style={{ textAlign: "center", padding: "40px 0 24px" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}><Crown size={52} /></div>
        <div style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: "0.4em", textTransform: "uppercase", color: color.cyan, marginBottom: 12 }}>{content.kicker}</div>
        <h1 style={{ fontFamily: font.display, fontWeight: 400, fontSize: "clamp(38px,7vw,72px)", lineHeight: 0.95, margin: 0 }}>{content.title}</h1>
        <p style={{ color: color.mut, fontSize: 17, maxWidth: 620, margin: "18px auto 0" }}>{content.lead}</p>
      </section>

      {content.sections.map((s, i) => (
        <section key={i} style={{ padding: "30px 0 0" }}>
          <SectionTag>{s.tag}</SectionTag>
          <h2 style={{ fontFamily: font.display, fontWeight: 400, fontSize: "clamp(26px,4vw,40px)", margin: "0 0 10px" }}>{s.heading}</h2>
          {s.body && <p style={{ color: color.mut, maxWidth: 640, margin: "0 0 16px" }}>{s.body}</p>}

          {s.steps && (
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", marginTop: 8 }}>
              {s.steps.map((st) => (
                <Panel key={st.n}>
                  <div style={{ fontFamily: font.mono, fontSize: 11, color: color.cyan, letterSpacing: "0.1em" }}>{st.n}</div>
                  <div style={{ fontFamily: font.display, fontSize: 19, color: color.cyanHi, marginTop: 8 }}>{st.t}</div>
                  <p style={{ fontSize: 13, color: color.mut, marginTop: 6, marginBottom: 0 }}>{st.d}</p>
                </Panel>
              ))}
            </div>
          )}

          {s.cards && (
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", marginTop: 8 }}>
              {s.cards.map((c) => (
                <Panel key={c.t} glow>
                  <div style={{ fontFamily: font.display, fontSize: 20, color: color.cyanHi }}>{c.t}</div>
                  <p style={{ fontSize: 13, color: color.mut, marginTop: 8, marginBottom: 0 }}>{c.d}</p>
                </Panel>
              ))}
            </div>
          )}

          {s.table && (
            <Panel style={{ marginTop: 8, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    {s.table.head.map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontFamily: font.mono, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: color.cyan, borderBottom: `1px solid ${color.line2}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.table.rows.map((r, ri) => (
                    <tr key={ri}>
                      {r.map((cell, ci) => (
                        <td key={ci} style={{ padding: "8px 10px", borderBottom: `1px solid ${color.line}`, color: ci === 0 ? color.txt : color.mut, fontFamily: ci === 0 ? font.body : font.mono }}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          )}
        </section>
      ))}

      <Panel style={{ marginTop: 36, textAlign: "center", border: "1px solid rgba(63,217,212,0.35)" }}>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
          <Badge tone="cyan">Patent Pending</Badge>
          <ButtonLink href={content.cta?.href || "/welcome"} as={Link} variant="primary">{content.cta?.label || "Claim your founder slab →"}</ButtonLink>
        </div>
      </Panel>

      <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", padding: "30px 0 10px", fontFamily: font.mono, fontSize: 11, color: color.mut }}>
        <Link href="/how-it-works" style={{ color: color.mut }}>How It Works</Link>
        <Link href="/royalties" style={{ color: color.mut }}>Royalties for Life</Link>
        <Link href="/creators" style={{ color: color.mut }}>For Creators</Link>
        <Link href="/collectors" style={{ color: color.mut }}>For Collectors</Link>
        <Link href="/trust" style={{ color: color.mut }}>Trust &amp; Security</Link>
      </div>
    </div>
  );
}
