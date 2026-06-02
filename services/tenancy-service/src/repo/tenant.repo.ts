import type { TenantStatus, TenantBranding, TenantSettings } from "@crownx-jewel/shared-tenancy";

export type Tenant = {
  id: string;
  slug: string;
  name: string;
  status: TenantStatus;
  branding: TenantBranding;
  settings: TenantSettings;
  createdAt: string;
  updatedAt: string;
};

export type TenantFeatureFlag = {
  id: string;
  tenantId: string;
  flagKey: string;
  enabled: boolean;
  updatedAt: string;
};

export type TenantPolicyAssignment = {
  id: string;
  tenantId: string;
  policyPackId: string;
  scope: "platform" | "campaigns" | "social" | "partner_listings";
  createdAt: string;
};

const tenants: Tenant[] = [];
const flags: TenantFeatureFlag[] = [];
const policies: TenantPolicyAssignment[] = [];

export const tenancyRepo = {
  insert(t: Tenant) { tenants.push(t); return t; },
  findById(id: string) { return tenants.find((t) => t.id === id) || null; },
  findBySlug(slug: string) { return tenants.find((t) => t.slug === slug) || null; },
  list() { return [...tenants].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); },
  update(id: string, patch: Partial<Tenant>) {
    const t = tenants.find((x) => x.id === id);
    if (t) Object.assign(t, patch);
    return t || null;
  },

  upsertFlag(f: TenantFeatureFlag) {
    const existing = flags.find((x) => x.tenantId === f.tenantId && x.flagKey === f.flagKey);
    if (existing) {
      existing.enabled = f.enabled;
      existing.updatedAt = f.updatedAt;
      return existing;
    }
    flags.push(f);
    return f;
  },
  flagsForTenant(tenantId: string) { return flags.filter((f) => f.tenantId === tenantId); },

  insertPolicy(p: TenantPolicyAssignment) { policies.push(p); return p; },
  policiesForTenant(tenantId: string) { return policies.filter((p) => p.tenantId === tenantId); }
};
