export interface RoyaltyBeneficiary {
  beneficiaryId: string;
  percentage: number;
}

export interface RoyaltyRule {
  id: string;
  assetId: string;
  beneficiaries: RoyaltyBeneficiary[];
  active: boolean;
  createdAt: string;
}

export interface RoyaltyDistribution {
  id: string;
  orderId: string;
  beneficiaryId: string;
  amount: number;
  createdAt: string;
}
