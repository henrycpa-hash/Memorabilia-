import Link from "next/link";
import { publicGet } from "../../lib/api";
import { Panel, Badge, color, font } from "@crownx-jewel/shared-design";

/** Marketplace gallery of Genesis COAs — each fully viewable in 3D/4D + AR/VR. */

type CoaListItem = { id: string; coaNumber: string; kind: string; title: string; valuationDisplay: string; confidence: number; viewCount: number; xrViewable: boolean };
type CoaListResp = { artifacts: CoaListItem[] };

export default async function MarketCoaGallery() {
  const data = await publicGet<CoaListResp>("/api/coa-artifact?limit=48");
  const items = data?.artifacts || [];
  return (
    <div style={{ maxWidth: 1080, margin: "0 auto" }}>
      <h1 style={{ fontFamily: font.display, fontWeight: 400, fontSize: 40, margin: 0 }}>Genesis COA · 3D/4D + AR/VR</h1>
      <p style={{ color: color.mut, fontSize: 13, margin: "4px 0 0", maxWidth: 620 }}>Inspect every certificate as a living holographic artifact, then step inside it on Meta Quest or AR glasses before you buy.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 14, marginTop: 20 }}>
        {items.map((c) => (
          <Link key={c.id} href={`/coa/${c.id}`} style={{ textDecoration: "none" }}>
            <Panel style={{ height: "100%", cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <Badge tone={c.kind === "genesis" ? "gold" : "cyan"}>{c.kind}</Badge>
                {c.xrViewable && <span style={{ fontFamily: font.mono, fontSize: 9, color: color.goldHi }}>🥽 AR/VR</span>}
              </div>
              <div style={{ height: 110, borderRadius: 10, background: "radial-gradient(circle at 50% 30%,rgba(63,217,212,0.16),transparent 60%),linear-gradient(160deg,#10131d,#06080f)", border: `1px solid ${color.line2}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                <span style={{ fontFamily: font.display, fontSize: 38, color: "rgba(255,255,255,0.12)" }}>◆</span>
              </div>
              <div style={{ fontFamily: font.display, fontSize: 16, color: color.txt, lineHeight: 1.05 }}>{c.title}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 8 }}>
                <span style={{ fontFamily: font.display, fontSize: 19, color: color.goldHi }}>{c.valuationDisplay}</span>
                <span style={{ fontFamily: font.mono, fontSize: 9, color: color.mut }}>{c.viewCount} views</span>
              </div>
            </Panel>
          </Link>
        ))}
      </div>
    </div>
  );
}
