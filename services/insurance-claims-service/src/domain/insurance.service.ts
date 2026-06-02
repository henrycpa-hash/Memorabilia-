import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import { mockInsuranceAdapter, type ClaimType, type ClaimStatus } from "@crownx-jewel/shared-insurance";
import {
  insuranceRepo,
  type InsurancePolicy,
  type Claim,
  type ClaimEvidence
} from "../repo/insurance.repo";

const settlementBase = () =>
  process.env.SETTLEMENT_SERVICE_URL || "http://localhost:4015";

export const insuranceService = {
  async bindPolicy(input: {
    shipmentId?: string;
    assetId: string;
    insuredAmount: number;
    description: string;
  }): Promise<InsurancePolicy> {
    const result = await mockInsuranceAdapter.bindPolicy({
      referenceId: input.shipmentId || input.assetId,
      insuredAmount: input.insuredAmount,
      description: input.description
    });
    const policy: InsurancePolicy = {
      id: newId(),
      shipmentId: input.shipmentId || null,
      assetId: input.assetId,
      provider: result.provider,
      policyNumber: result.policyNumber,
      insuredAmount: input.insuredAmount.toFixed(2),
      policyState: result.policyState,
      description: input.description,
      createdAt: nowIso()
    };
    insuranceRepo.insertPolicy(policy);
    await publishOutbox({
      id: newId(),
      eventType: "insurance.policy.bound",
      aggregateId: policy.id,
      aggregateType: "insurance_policy",
      payload: policy,
      occurredAt: nowIso()
    });
    return policy;
  },

  async openClaim(input: {
    policyId: string;
    settlementId?: string;
    claimType: ClaimType;
    description: string;
  }): Promise<Claim | null> {
    const policy = insuranceRepo.findPolicy(input.policyId);
    if (!policy) return null;

    const result = await mockInsuranceAdapter.openClaim({
      policyNumber: policy.policyNumber,
      claimType: input.claimType,
      description: input.description
    });
    const claim: Claim = {
      id: newId(),
      policyId: input.policyId,
      settlementId: input.settlementId || null,
      externalClaimId: result.externalClaimId,
      claimType: input.claimType,
      status: result.status,
      description: input.description,
      evidenceCount: 0,
      createdAt: nowIso(),
      resolvedAt: null
    };
    insuranceRepo.insertClaim(claim);

    // Wave 5 guardrail: opening a claim against an active settlement places it
    // on hold until the claim resolves.
    if (input.settlementId) {
      try {
        await fetch(`${settlementBase()}/internal/settlements/${input.settlementId}/hold`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reason: `Insurance claim ${claim.externalClaimId}: ${input.claimType}` })
        });
      } catch {
        // best-effort
      }
    }

    await publishOutbox({
      id: newId(),
      eventType: "insurance.claim.opened",
      aggregateId: claim.id,
      aggregateType: "claim",
      payload: claim,
      occurredAt: nowIso()
    });

    return claim;
  },

  async addEvidence(input: {
    claimId: string;
    kind: ClaimEvidence["kind"];
    uri: string;
    note?: string;
  }): Promise<ClaimEvidence | null> {
    const claim = insuranceRepo.findClaim(input.claimId);
    if (!claim) return null;
    const e: ClaimEvidence = {
      id: newId(),
      claimId: input.claimId,
      kind: input.kind,
      uri: input.uri,
      note: input.note || null,
      createdAt: nowIso()
    };
    insuranceRepo.insertEvidence(e);
    return e;
  },

  async resolveClaim(input: {
    claimId: string;
    status: ClaimStatus;
    note?: string;
  }): Promise<Claim | null> {
    const claim = insuranceRepo.findClaim(input.claimId);
    if (!claim) return null;
    const updated = insuranceRepo.updateClaim(claim.id, {
      status: input.status,
      resolvedAt: nowIso()
    });

    if (updated && updated.settlementId) {
      try {
        if (input.status === "approved_refund") {
          await fetch(`${settlementBase()}/settlements/${updated.settlementId}/refund`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ reason: `Insurance refund: ${input.note || "approved"}` })
          });
        } else if (
          input.status === "approved_payout" ||
          input.status === "approved_replacement" ||
          input.status === "denied" ||
          input.status === "withdrawn" ||
          input.status === "closed"
        ) {
          await fetch(`${settlementBase()}/settlements/${updated.settlementId}/release`, {
            method: "POST",
            headers: { "content-type": "application/json" }
          });
        }
      } catch {
        // best-effort
      }
    }

    await publishOutbox({
      id: newId(),
      eventType: "insurance.claim.resolved",
      aggregateId: claim.id,
      aggregateType: "claim",
      payload: { claimId: claim.id, status: input.status },
      occurredAt: nowIso()
    });

    return updated;
  },

  listPolicies: () => insuranceRepo.listPolicies(),
  findPolicy: (id: string) => insuranceRepo.findPolicy(id),
  policiesForAsset: (a: string) => insuranceRepo.policiesForAsset(a),
  policiesForShipment: (s: string) => insuranceRepo.policiesForShipment(s),
  listClaims: () => insuranceRepo.listClaims(),
  findClaim: (id: string) => insuranceRepo.findClaim(id),
  claimsForSettlement: (s: string) => insuranceRepo.claimsForSettlement(s),
  evidenceForClaim: (c: string) => insuranceRepo.evidenceForClaim(c)
};
