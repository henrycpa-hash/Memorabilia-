import Link from "next/link";
import { publicGet } from "../../lib/api";
import { SectionTag, Panel, Badge, color, font } from "@crownx-jewel/shared-design";

/**
 * The Genesis COA Vault — a gallery of dynamic 3D/4D certificates. Each one is a
 * dual-pane holographic artifact (live capture + provenance), fully viewable in
 * the market, in viral shares, and in AR/VR (Meta Quest / AR glasses).
 */

type CoaListItem = {
  id: string; coaNumber: string; kind: string; title: string; assetType: string;
  athleteId?: string; ownerUserId: string; valuationDisplay: string; confidence: number;
  viewCount: number; xrSessionCount: number; xrViewable: boolean;
};
type CoaListResp = { artifacts: CoaListItem[]; stats: { artifacts: number; xrSessions: number; unlocks: number; totalViews: number } };

export default async function CoaGallery() {
  const data = await publicGet<CoaListResp>("/api/coa-artifact?limit=48");
  const items = data?.artifacts || [];
  const stats = data?.stats;

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: font.display, fontWeight: 400, fontSize: 44, margin: 0 }}>Genesis COA Vault</h1>
          <p style={{ color: color.mut, fontSize: 13, margin: "4px 0 0", maxWidth: 620 }}>
            Every authenticated mint becomes a living, dual-pane <b style={{ color: color.cyanHi }}>3D/4D certificate</b> — live-capture
            video, provenance, micro-detail and chain anchors — viewable in the market, in viral shares, and fully immersive in
            <b style={{ color: color.goldHi }}> AR/VR (Meta Quest · AR glasses)</b>.
          </p>
        </div>
        {stats && (
          <div style={{ display: "flex", gap: 18, fontFamily: font.mono, fontSize: 11, color: color.mut }}>
            <span><b style={{ color: color.cyanHi, fontFamily: font.display, fontSize: 22 }}>{stats.artifacts}</b><br />artifacts</span>
            <span><b style={{ color: color.cyanHi, fontFamily: font.display, fontSize: 22 }}>{stats.totalViews}</b><br />views</span>
            <span><b style={{ color: color.goldHi, fontFamily: font.display, fontSize: 22 }}>{stats.xrSessions}</b><br />XR sessions</span>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))", gap: 14, marginTop: 22 }}>
        {items.length === 0 && <Panel><p style={{ color: color.mut, margin: 0 }}>No COAs yet — mint one to issue the first Genesis artifact.</p></Panel>}
        {items.map((c) => (
          <Link key={c.id} href={`/coa/${c.id}`} style={{ textDecoration: "none" }}>
            <Panel style={{ height: "100%", transition: ".15s", cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Badge tone={c.kind === "genesis" ? "gold" : c.kind === "verified" ? "cyan" : "mut"}>{c.kind}</Badge>
                {c.xrViewable && <span style={{ fontFamily: font.mono, fontSize: 9, color: color.goldHi }}>🥽 AR/VR</span>}
              </div>
              <div style={{ height: 116, borderRadius: 10, background: "radial-gradient(circle at 50% 30%,rgba(63,217,212,0.16),transparent 60%),linear-gradient(160deg,#10131d,#06080f)", border: `1px solid ${color.line2}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                <span style={{ fontFamily: font.display, fontSize: 40, color: "rgba(255,255,255,0.12)" }}>◆</span>
              </div>
              <div style={{ fontFamily: font.display, fontSize: 17, color: color.txt, lineHeight: 1.05 }}>{c.title}</div>
              <div style={{ fontFamily: font.mono, fontSize: 9, color: color.mut2, marginTop: 3 }}>{c.coaNumber} · conf {c.confidence}%</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 10 }}>
                <span style={{ fontFamily: font.display, fontSize: 20, color: color.goldHi }}>{c.valuationDisplay}</span>
                <span style={{ fontFamily: font.mono, fontSize: 9, color: color.mut }}>{c.viewCount} views</span>
              </div>
            </Panel>
          </Link>
        ))}
      </div>
    </div>
  );
}
