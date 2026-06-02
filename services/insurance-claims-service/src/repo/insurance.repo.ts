import type { ClaimType, ClaimStatus, PolicyState } from "@crownx-jewel/shared-insurance";

export type InsurancePolicy = {
  id: string;
  shipmentId: string | null;
  assetId: string;
  provider: string;
  policyNumber: string;
  insuredAmount: string;
  policyState: PolicyState;
  description: string;
  createdAt: string;
};

export type Claim = {
  id: string;
  policyId: string;
  settlementId: string | null;
  externalClaimId: string | null;
  claimType: ClaimType;
  status: ClaimStatus;
  description: string;
  evidenceCount: number;
  createdAt: string;
  resolvedAt: string | null;
};

export type ClaimEvidence = {
  id: string;
  claimId: string;
  kind: "photo" | "video" | "document" | "note";
  uri: string;
  note: string | null;
  createdAt: string;
};

const policies: InsurancePolicy[] = [];
const claims: Claim[] = [];
const evidence: ClaimEvidence[] = [];

export const insuranceRepo = {
  insertPolicy(p: InsurancePolicy) { policies.push(p); return p; },
  findPolicy(id: string) { return policies.find((p) => p.id === id) || null; },
  listPolicies() { return [...policies].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); },
  policiesForShipment(shipmentId: string) {
    return policies.filter((p) => p.shipmentId === shipmentId);
  },
  policiesForAsset(assetId: string) {
    return policies.filter((p) => p.assetId === assetId);
  },
  updatePolicy(id: string, patch: Partial<InsurancePolicy>) {
    const p = policies.find((x) => x.id === id);
    if (p) Object.assign(p, patch);
    return p || null;
  },

  insertClaim(c: Claim) { claims.push(c); return c; },
  findClaim(id: string) { return claims.find((c) => c.id === id) || null; },
  listClaims() { return [...claims].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); },
  claimsForPolicy(policyId: string) { return claims.filter((c) => c.policyId === policyId); },
  claimsForSettlement(settlementId: string) {
    return claims.filter((c) => c.settlementId === settlementId);
  },
  updateClaim(id: string, patch: Partial<Claim>) {
    const c = claims.find((x) => x.id === id);
    if (c) Object.assign(c, patch);
    return c || null;
  },

  insertEvidence(e: ClaimEvidence) {
    evidence.push(e);
    const c = claims.find((x) => x.id === e.claimId);
    if (c) c.evidenceCount += 1;
    return e;
  },
  evidenceForClaim(claimId: string) {
    return evidence.filter((e) => e.claimId === claimId);
  }
};
