import Link from "next/link";
import { publicGet } from "../../../lib/api";
import { Panel, Badge, ButtonLink, color, font, CoaViewer3D, type CoaArtifactView } from "@crownx-jewel/shared-design";
import { ShareCoa } from "./ShareCoa";

/**
 * Public Genesis COA viewer — the artifact "fully viewed" in 3D/4D + AR/VR.
 * No auth required (publicGet) so it is shareable as a viral link and embeddable
 * in the market. The CoaViewer3D handles dual-pane rotation, unlockables, and
 * immersive WebXR (Meta Quest / AR glasses).
 */

const GATEWAY = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000";

export default async function CoaViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const artifact = await publicGet<CoaArtifactView>(`/api/coa-artifact/${id}`);

  if (!artifact) {
    return (
      <Panel glow>
        <p style={{ color: color.mut, margin: 0 }}>COA not found. <Link href="/coa" style={{ color: color.cyan }}>Back to the COA Vault →</Link></p>
      </Panel>
    );
  }

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto" }}>
      <Link href="/coa" style={{ fontFamily: font.mono, fontSize: 11, color: color.mut }}>← Genesis COA Vault</Link>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap", marginTop: 10 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ fontFamily: font.display, fontWeight: 400, fontSize: 40, margin: 0 }}>{artifact.title}</h1>
            <Badge tone={artifact.kind === "genesis" ? "gold" : artifact.kind === "verified" ? "cyan" : "mut"}>{artifact.kind} COA</Badge>
          </div>
          <div style={{ fontFamily: font.mono, fontSize: 11, color: color.mut, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            {artifact.coaNumber} · {artifact.assetType} · {artifact.tokenId.slice(0, 18)}… · {artifact.confidence}% confidence
          </div>
        </div>
        <ShareCoa id={artifact.id} title={artifact.title} shareUrl={artifact.shareUrl} />
      </div>

      <Panel style={{ marginTop: 16 }}>
        <CoaViewer3D artifact={artifact} apiBase={GATEWAY} userId={artifact.paneB.ownership.recipient} />
      </Panel>

      <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
        {artifact.athleteId && <ButtonLink href={`/athletes/${artifact.athleteId}`} as={Link} variant="secondary">View athlete account →</ButtonLink>}
        <ButtonLink href="/coa" as={Link} variant="secondary">← All certificates</ButtonLink>
        <ButtonLink href="/terms" as={Link} variant="secondary">Governed by CrownX Terms →</ButtonLink>
      </div>

      <p style={{ fontFamily: font.mono, fontSize: 9.5, color: color.mut2, lineHeight: 1.7, marginTop: 18, maxWidth: 760 }}>
        Beyond PDFs: a conventional COA is a static image. This Genesis COA is a dynamic, cryptographically sealed artifact —
        live-capture video with tamper-validated overlays, micro-detail surface scan, expanded identifiers, and dual-anchored
        blockchain evidence — rendered as an immersive object you can rotate, unlock, and step inside via AR/VR.
      </p>
    </div>
  );
}
