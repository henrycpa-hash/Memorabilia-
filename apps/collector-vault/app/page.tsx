import Link from "next/link";
import {
  Hero,
  ButtonLink,
  Panel,
  SectionTag,
  Badge,
  color,
  font
} from "@crownx-jewel/shared-design";

const PILLARS = [
  { t: "Genesis COA", d: "AI live-capture mints authenticity at the moment of the moment — tamper-evident, chain-anchored." },
  { t: "Royalties for Life", d: "A fixed 10% on every resale, split between you, the athlete, and CrownX. Keep up to 85%." },
  { t: "Live Market", d: "Every slab carries a floor that moves while you sleep — the reason to come back." },
  { t: "/LV99 Status", d: "A visible rank that only climbs and gates the rarest founder drops." }
];

export default function HomePage() {
  return (
    <>
      <Hero
        kicker="Verify · Protect · Monetize"
        title={
          <>
            Own the moment.
            <br />
            <span style={{ color: color.cyanHi }}>Earn from it forever.</span>
          </>
        }
        lead="CrownX turns any authenticated collectible into a graded, chain-anchored slab — with a 10% royalty that pays you on every resale, for life."
        actions={
          <>
            <ButtonLink href="/login" as={Link} variant="primary">
              Enter your Vault →
            </ButtonLink>
            <ButtonLink href="/dashboard" as={Link} variant="secondary">
              See the floor
            </ButtonLink>
          </>
        }
      />

      <section style={{ marginTop: 8 }}>
        <SectionTag>Why CrownX</SectionTag>
        <h2 style={{ fontFamily: font.display, fontWeight: 400, fontSize: 40, margin: "0 0 18px" }}>
          One vault. Every collectible.
        </h2>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))" }}>
          {PILLARS.map((p) => (
            <Panel key={p.t} glow>
              <div style={{ fontFamily: font.display, fontSize: 20, color: color.cyanHi, letterSpacing: "0.02em" }}>{p.t}</div>
              <p style={{ color: color.mut, fontSize: 13, marginTop: 8, marginBottom: 0 }}>{p.d}</p>
            </Panel>
          ))}
        </div>
      </section>

      <Panel style={{ marginTop: 20, border: "1px dashed rgba(217,168,46,0.4)", background: "rgba(217,168,46,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <Badge tone="gold">Pricing preserved</Badge>
          <p style={{ color: color.mut, fontSize: 13, margin: 0, flex: 1, minWidth: 240 }}>
            Subscription prices and fee logic live in the platform code — untouched by this revamp. Higher tiers
            simply shift more of the 10% royalty to you.
          </p>
        </div>
      </Panel>
    </>
  );
}
