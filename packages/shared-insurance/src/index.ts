/**
 * Wave 5 insurance + claims abstractions.
 *
 * Adapter binds policies to shipments/vault-storage and opens claims when
 * incidents occur. Wave 5 ships a mock that synthesizes policy numbers;
 * Wave 6 plugs in real insurer APIs (Lloyd's syndicates, etc.).
 */
export type PolicyState = "draft" | "bound" | "active" | "expired" | "canceled";

export type ClaimType =
  | "shipment_lost"
  | "shipment_damaged"
  | "shipment_theft"
  | "vault_incident"
  | "authenticity_dispute_loss"
  | "other";

export type ClaimStatus =
  | "open"
  | "under_review"
  | "approved_payout"
  | "approved_replacement"
  | "approved_refund"
  | "denied"
  | "withdrawn"
  | "closed";

export interface InsuranceAdapter {
  bindPolicy(input: {
    referenceId: string;
    insuredAmount: number;
    description: string;
  }): Promise<{
    policyNumber: string;
    provider: string;
    policyState: PolicyState;
  }>;

  openClaim(input: {
    policyNumber: string;
    claimType: ClaimType;
    description: string;
  }): Promise<{
    externalClaimId: string;
    status: ClaimStatus;
  }>;
}

/** Mock insurance adapter — synthetic policy + claim IDs, immediate "bound". */
export const mockInsuranceAdapter: InsuranceAdapter = {
  async bindPolicy(input) {
    return {
      policyNumber: `POL-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      provider: "mock_insurer",
      policyState: "bound"
    };
  },
  async openClaim(input) {
    return {
      externalClaimId: `CLM-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      status: "under_review"
    };
  }
};
