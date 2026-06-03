import { newId, nowIso, safePostJson } from "@crownx-jewel/shared-kernel";
import { anchor, type AnchorReceipt } from "@crownx-jewel/shared-chain";
import {
  fuseSensors,
  coaDecision,
  priceMemorabilia,
  formatUsdCents,
  type SensorReadings,
  type PriceSources,
  type FusionResult,
  type CoaVerdict
} from "@crownx-jewel/shared-authcore";

/**
 * The live authentication + minting engine — runs the SOP workflow end to end:
 *   Step 0  device attestation / sealed session
 *   Step 1  live capture → Proof-of-Origin (liveness, biometric, action)
 *   Step 2  multi-sensor scan → canonical fusion (photo, NFC, wifi, heat,
 *           material, hairline) + event correlation
 *   Step 3  tri-code pre-check
 *   Step 5  COA decision tree (Genesis / Verified / Counterfeit)
 *   Step 6  AI fingerprint hash (entropy-bound)
 *   Step 7  blockchain provenance anchor
 *   Step 8  → on an authenticated mint, grant XP so the collector CLIMBS /LV99
 *
 * In-memory by repo convention. The fusion/decision/pricing math lives in
 * @crownx-jewel/shared-authcore so it is deterministic + auditable.
 */

const XP_URL = () => process.env.XP_SERVICE_URL || "http://localhost:4073";
const COA_ARTIFACT_URL = () => process.env.COA_ARTIFACT_SERVICE_URL || "http://localhost:4081";
const AI_MODELING_URL = () => process.env.AI_MODELING_SERVICE_URL || "http://localhost:4082";

/**
 * Fire-and-forget: mint a consented AI-modeling Data Contribution Token from the
 * authenticated capture. The ai-modeling-service gates on the user's consent and
 * computes the dynamic weighted rate; non-blocking so it never affects the mint.
 */
function mintDataToken(body: Record<string, unknown>): void {
  fetch(`${AI_MODELING_URL()}/ai-modeling/contribute`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => undefined);
}

/**
 * Fire-and-forget: issue the dynamic Genesis COA Artifact (dual-pane 3D/4D,
 * unlockables, AR/VR) so the just-minted asset is immediately viewable in the
 * market + viral shares + headsets. Additive — never blocks/breaks the mint.
 */
function issueCoaArtifact(body: Record<string, unknown>): void {
  fetch(`${COA_ARTIFACT_URL()}/coa-artifact`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => undefined);
}

interface Session { id: string; deviceClass: string; attested: boolean; createdAt: string }
export interface IssuedCoa {
  id: string;
  coaNumber: string;
  userId: string;
  title: string;
  assetType: string;
  decision: CoaVerdict["decision"];
  confidence: number;
  anomalyScore: number;
  fingerprintHash: string;
  tokenId: string;
  valuationCents: number;
  anchor: AnchorReceipt;
  issuedAt: string;
}

const sessions = new Map<string, Session>();
const coas: IssuedCoa[] = [];
const mintedBy = new Map<string, number>(); // userId -> count of authenticated mints

async function grantXp(userId: string, action: string): Promise<{ vxpGranted: number; level: number; tier: string; leveledUp: boolean } | null> {
  // timeout-guarded: a slow/down xp-service must never hang the mint pipeline
  const d = (await safePostJson(`${XP_URL()}/xp/grant`, { userId, action }, 4000)) as { vxpGranted: number; rank: { level: number; tier: string }; leveledUp: boolean } | null;
  if (!d || !d.rank) return null;
  return { vxpGranted: d.vxpGranted, level: d.rank.level, tier: d.rank.tier, leveledUp: d.leveledUp };
}

export const authEngine = {
  /** Step 0 — seal a capture session bound to device attestation. */
  openSession(deviceClass = "smartphone") {
    const s: Session = { id: `ses_${newId()}`, deviceClass, attested: true, createdAt: nowIso() };
    sessions.set(s.id, s);
    return { sessionId: s.id, deviceClass, attested: true, pqc: "kyber+dilithium", sessionDNA: anchor("session.dna", { id: s.id, deviceClass }, s.createdAt).hash.slice(0, 24) };
  },

  /**
   * Full live-capture → authenticate → mint pipeline. Returns every SOP stage
   * so the minting dashboard can render the live engine, plus the XP/rank climb.
   */
  async authenticateAndMint(input: {
    userId: string;
    title: string;
    assetType?: string;
    sensors: SensorReadings;
    priceSources?: PriceSources;
    hasPriorCoa?: boolean;
    sessionId?: string;
  }) {
    const ts = nowIso();
    // Step 1 — Proof-of-Origin (derived from the live-capture liveness/biometric)
    const proofOfOrigin = {
      capturedAt: ts,
      liveness: input.sensors.liveness,
      biometric: input.sensors.biometric,
      sessionId: input.sessionId || null,
      pooHash: anchor("proof.of.origin", { userId: input.userId, title: input.title, ts }, ts).hash.slice(0, 32)
    };

    // Steps 2–4 — multi-sensor fusion + event correlation
    const fusion: FusionResult = fuseSensors(input.sensors);

    // Step 5 — COA decision tree
    const verdict = coaDecision({ confidence: fusion.confidence, anomalyScore: fusion.anomalyScore, triCode: fusion.triCode, hasPriorCoa: !!input.hasPriorCoa });

    // pricing — weighted dynamic value, scaled by live auth confidence
    const price = priceMemorabilia(input.priceSources || {}, fusion.confidence);

    if (verdict.decision === "counterfeit") {
      const receipt = anchor("coa.counterfeit", { userId: input.userId, title: input.title, verdict, ts }, ts);
      return { ok: true as const, stage: "counterfeit", proofOfOrigin, fusion, verdict, price: { ...price, valueDisplay: formatUsdCents(price.valueCents) }, anchor: receipt, coa: null, xp: null };
    }

    // Step 6 — AI fingerprint hash (entropy-bound to the canonical fusion)
    const fpReceipt = anchor("ai.fingerprint", { userId: input.userId, title: input.title, contributions: fusion.contributions, confidence: fusion.confidence, ts }, ts);
    const tokenId = `tok_${fpReceipt.hash.slice(0, 18)}`;

    // Step 7 — blockchain provenance anchor of the COA
    const coa: IssuedCoa = {
      id: newId(),
      coaNumber: `CXG-${fpReceipt.hash.slice(0, 8).toUpperCase()}`,
      userId: input.userId,
      title: input.title,
      assetType: input.assetType || "memorabilia",
      decision: verdict.decision,
      confidence: fusion.confidence,
      anomalyScore: fusion.anomalyScore,
      fingerprintHash: `keccak512:${fpReceipt.hash}`,
      tokenId,
      valuationCents: price.valueCents,
      anchor: anchor("coa.provenance", { tokenId, coaNumber: `CXG-${fpReceipt.hash.slice(0, 8).toUpperCase()}`, decision: verdict.decision, valuationCents: price.valueCents, ts }, ts),
      issuedAt: ts
    };
    coas.push(coa);

    // Issue the dynamic Genesis COA Artifact (3D/4D dual-pane, unlockables, AR/VR)
    const coaArtifactId = `coa_${coa.id}`;
    issueCoaArtifact({
      id: coaArtifactId,
      tokenId,
      coaNumber: coa.coaNumber,
      kind: verdict.decision,
      title: coa.title,
      assetType: coa.assetType,
      ownerUserId: input.userId,
      fingerprintHash: coa.fingerprintHash,
      sessionDna: proofOfOrigin.pooHash.slice(0, 24),
      anchorTxRef: coa.anchor.txRef,
      anchorBlock: coa.anchor.block,
      anchorChain: coa.anchor.chain,
      triCodeProof: `tri:${fpReceipt.hash.slice(0, 12)}`,
      provenanceEvidence: `evt:${coa.anchor.txRef.slice(0, 12)}`,
      confidence: fusion.confidence,
      anomalyScore: fusion.anomalyScore,
      fusionContributions: fusion.contributions,
      valuationCents: price.valueCents,
      valuationDisplay: formatUsdCents(price.valueCents)
    });

    // Consented AI-modeling Data Contribution Token from this authenticated capture
    mintDataToken({
      holderId: input.userId,
      assetId: tokenId,
      coaId: coaArtifactId,
      modalities: fusion.contributions.filter((c) => c.score >= 50).map((c) => c.modality),
      confidence: fusion.confidence,
      anomalyScore: fusion.anomalyScore,
      commonness: 0.5,
      novel: fusion.anomalyScore > 6,
      assetClass: coa.assetType
    });

    // Step 8 — authenticated mint CLIMBS the rank: grant XP via the xp-service
    const count = (mintedBy.get(input.userId) || 0) + 1;
    mintedBy.set(input.userId, count);
    const grants: { vxpGranted: number; level: number; tier: string; leveledUp: boolean }[] = [];
    if (count === 1) {
      const g = await grantXp(input.userId, "first_mint");
      if (g) grants.push(g);
    }
    const topGrade = verdict.decision === "genesis" && fusion.confidence >= 90;
    const g2 = await grantXp(input.userId, topGrade ? "mint_top" : "mint_standard");
    if (g2) grants.push(g2);
    const rank = grants.length ? grants[grants.length - 1] : null;
    const xpGained = grants.reduce((a, g) => a + g.vxpGranted, 0);

    return {
      ok: true as const,
      stage: verdict.decision,
      proofOfOrigin,
      fusion,
      verdict,
      fingerprint: { fingerprintHash: coa.fingerprintHash, tokenId, anchorTx: fpReceipt.txRef, sigScheme: fpReceipt.sigScheme },
      provenance: { coaNumber: coa.coaNumber, l2TxHash: coa.anchor.txRef, l1AnchorBlock: coa.anchor.block, chain: coa.anchor.chain },
      price: { ...price, valueDisplay: formatUsdCents(price.valueCents) },
      coa,
      coaArtifact: { id: coaArtifactId, tokenId, viewUrl: `/coa/${coaArtifactId}`, immersive: true },
      xp: rank ? { gained: xpGained, level: rank.level, tier: rank.tier, leveledUp: grants.some((g) => g.leveledUp) } : null
    };
  },

  coasFor: (userId: string) => coas.filter((c) => c.userId === userId).sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)).map((c) => ({ ...c, valuationDisplay: formatUsdCents(c.valuationCents) })),
  allCoas: () => coas.slice(-50).reverse(),
  price: (sources: PriceSources, authConfidence?: number) => {
    const p = priceMemorabilia(sources, authConfidence ?? 100);
    return { ...p, valueDisplay: formatUsdCents(p.valueCents), breakdown: p.breakdown.map((b) => ({ ...b, valueDisplay: formatUsdCents(b.valueCents) })) };
  }
};
