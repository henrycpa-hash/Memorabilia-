/**
 * Wave 7 contract lifecycle primitives. Agreements, amendments, obligations,
 * counterparties. Built so that contract-aware policy evaluation can resolve
 * a governing agreement before campaign launch.
 */
export type AgreementType =
  | "nil_agreement"
  | "creator_representation"
  | "dealer_distribution"
  | "auction_house_services"
  | "institution_platform"
  | "sponsorship"
  | "licensing"
  | "royalty_amendment";

export type CounterpartyType =
  | "creator"
  | "institution"
  | "tenant"
  | "agency"
  | "dealer"
  | "auction_house"
  | "league"
  | "school"
  | "sponsor";

export type AgreementStatus =
  | "draft"
  | "under_review"
  | "approved"
  | "active"
  | "expiring"
  | "expired"
  | "terminated";

export type ObligationType =
  | "compliance_report_due"
  | "renewal_review_due"
  | "rights_window_expiry_review"
  | "royalty_schedule_review"
  | "partner_sla_review"
  | "sponsorship_approval_check";

export type ObligationStatus = "pending" | "in_progress" | "satisfied" | "overdue" | "waived";

export type AgreementTerms = {
  rightsScope?: {
    territories?: string[];
    audienceTypes?: string[];
    rightsWindowDays?: number;
  };
  royaltySchedule?: Array<{ beneficiaryId: string; percentage: number }>;
  sponsorshipCaps?: { maxRewardUsd?: number; allowedSponsorCategories?: string[] };
  prohibitedTerms?: string[];
  schoolLeagueRestrictions?: string[];
  notes?: string;
};

/**
 * Soft-state helper: derive expiring/expired transitions deterministically.
 */
export function nextAgreementStatus(
  current: AgreementStatus,
  effectiveDate: string,
  expirationDate: string | null,
  asOf: string
): AgreementStatus {
  const now = new Date(asOf).getTime();
  const eff = new Date(effectiveDate).getTime();
  const exp = expirationDate ? new Date(expirationDate).getTime() : null;
  if (current === "approved" && now >= eff) return "active";
  if (current === "active" && exp != null && now >= exp) return "expired";
  if (current === "active" && exp != null && now >= exp - 30 * 24 * 60 * 60 * 1000) return "expiring";
  return current;
}
