/**
 * Wave 6 agency / team primitives. Organizations have members in roles,
 * delegate approvals via approval tasks, and represent creator-side ops teams.
 */
export type OrgType = "agency" | "tenant_team" | "league_office" | "school_program";

export type MemberRole =
  | "owner"
  | "manager"
  | "assistant"
  | "finance"
  | "campaign_operator"
  | "compliance_reviewer"
  | "content_approver";

export type MemberStatus = "invited" | "active" | "suspended";

export type ApprovalTaskStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "withdrawn"
  | "expired";

export type ApprovalRoute = {
  aggregateType: "campaign" | "social_post" | "settlement_release" | "policy_override" | "partner_listing";
  requiredRoles: MemberRole[];
};

/**
 * Default Wave 6 approval routes. Each route describes which roles must
 * approve before the listed aggregate can advance.
 */
export const DEFAULT_APPROVAL_ROUTES: ApprovalRoute[] = [
  { aggregateType: "campaign", requiredRoles: ["compliance_reviewer", "content_approver"] },
  { aggregateType: "social_post", requiredRoles: ["content_approver"] },
  { aggregateType: "settlement_release", requiredRoles: ["finance"] },
  { aggregateType: "policy_override", requiredRoles: ["compliance_reviewer", "manager"] },
  { aggregateType: "partner_listing", requiredRoles: ["compliance_reviewer"] }
];

export function approvalRouteFor(aggregateType: ApprovalRoute["aggregateType"]): ApprovalRoute | null {
  return DEFAULT_APPROVAL_ROUTES.find((r) => r.aggregateType === aggregateType) || null;
}
