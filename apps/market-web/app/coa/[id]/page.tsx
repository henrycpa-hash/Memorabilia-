import Link from "next/link";
import { publicGet, GATEWAY_URL } from "../../../lib/api";
import { Panel, Badge, color, font, CoaViewer3D, type CoaArtifactView } from "@crownx-jewel/shared-design";

/**
 * Marketplace Genesis COA viewer — buyers inspect the full dynamic 3D/4D
 * certificate (live capture + provenance + micro-detail + anchors) and step
 * inside it via AR/VR before they buy. Public route → also a viral-share target.
 */
export default async function MarketCoaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const artifact = await publicGet<CoaArtifactView>(`/api/coa-artifact/${id}`);

  if (!artifact) {
    return <Panel><p style={{ color: color.mut, margin: 0 }}>COA not found. <Link href="/" style={{ color: color.cyan }}>Back to the market →</Link></p></Panel>;
  }

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto" }}>
      <Link href="/" style={{ fontFamily: font.mono, fontSize: 11, color: color.mut }}>← Marketplace</Link>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
        <h1 style={{ fontFamily: font.display, fontWeight: 400, fontSize: 38, margin: 0 }}>{artifact.title}</h1>
        <Badge tone={artifact.kind === "genesis" ? "gold" : "cyan"}>{artifact.kind} COA</Badge>
      </div>
      <div style={{ fontFamily: font.mono, fontSize: 11, color: color.mut, textTransform: "uppercase" }}>{artifact.coaNumber} · {artifact.valuationDisplay} · {artifact.confidence}% confidence</div>
      <Panel style={{ marginTop: 16 }}>
        <CoaViewer3D artifact={artifact} apiBase={GATEWAY_URL} userId={artifact.paneB.ownership.recipient} />
      </Panel>
    </div>
  );
}
