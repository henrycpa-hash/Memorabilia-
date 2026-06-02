/**
 * Wave 6 tenancy primitives.
 *
 * Tenants are top-level isolation boundaries for the platform. Each tenant
 * carries branding, a feature flag set, a policy pack reference, and an
 * optional billing scope. Tenant headers (X-Tenant-Slug) are propagated by
 * the gateway and used by service-level guards (Wave 7 hardens this).
 */
export type TenantStatus = "draft" | "active" | "suspended" | "archived";

export type TenantBranding = {
  displayName: string;
  primaryColor?: string; // hex
  secondaryColor?: string;
  logoUrl?: string;
  faviconUrl?: string;
  customDomain?: string;
};

export type TenantSettings = {
  defaultCurrency?: string;
  timeZone?: string;
  defaultLocale?: string;
  policyPackId?: string;
  enabledChannels?: string[];
};

export type FeatureFlagKey =
  | "auctions"
  | "campaigns"
  | "experiments"
  | "social_publishing"
  | "ml_risk"
  | "partner_inventory"
  | "agency_workflows"
  | "compliance_packs"
  | "high_value_insurance";

export const DEFAULT_FEATURE_FLAGS: Record<FeatureFlagKey, boolean> = {
  auctions: true,
  campaigns: true,
  experiments: true,
  social_publishing: true,
  ml_risk: true,
  partner_inventory: false,
  agency_workflows: false,
  compliance_packs: false,
  high_value_insurance: true
};
