/**
 * Wave 7 enterprise SSO primitives.
 *
 * Tenant-scoped IdP federation, role/group mapping, JIT provisioning, SCIM
 * sync shape. Wave 7 ships a deterministic in-memory implementation; Wave 8
 * wires real SAML/OIDC libraries.
 */
export type ProviderType = "saml" | "oidc" | "google_workspace" | "azure_ad" | "okta";

export type ProviderStatus = "draft" | "active" | "suspended" | "archived";

export type SsoSessionClaims = {
  email: string;
  externalUserId: string;
  externalGroups: string[];
  givenName?: string;
  familyName?: string;
};

export type ScimSyncStatus = "queued" | "running" | "succeeded" | "partial" | "failed";

export type ScimUserPayload = {
  externalUserId: string;
  email: string;
  givenName?: string;
  familyName?: string;
  active: boolean;
  groups: string[];
};

/** Map external groups → internal roles using a registered mapping. */
export function resolveInternalRoles(
  externalGroups: string[],
  mappings: Array<{ externalGroup: string; internalRole: string }>
): string[] {
  const roles = new Set<string>();
  for (const grp of externalGroups) {
    for (const m of mappings) if (m.externalGroup === grp) roles.add(m.internalRole);
  }
  return Array.from(roles);
}
