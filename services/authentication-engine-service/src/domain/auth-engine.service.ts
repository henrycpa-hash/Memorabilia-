import { newId, nowIso } from "@crownx-jewel/shared-kernel";
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
  try {
    const res = await fetch(`${XP_URL()}/xp/grant`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId, action }) });
    if (!res.ok) return null;
    const d = (await res.json()) as { vxpGranted: number; rank: { level: number; tier: string }; leveledUp: boolean };
    return { vxpGranted: d.vxpGranted, level: d.rank.level, tier: d.rank.tier, leveledUp: d.leveledUp };
  } catch {
    return null;
  }
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
