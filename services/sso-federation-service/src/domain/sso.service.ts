import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import {
  resolveInternalRoles,
  type ProviderType,
  type ProviderStatus,
  type ScimSyncStatus,
  type ScimUserPayload,
  type SsoSessionClaims
} from "@crownx-jewel/shared-sso";

export type IdentityProvider = {
  id: string;
  tenantId: string;
  providerType: ProviderType;
  issuer: string;
  metadataJson: Record<string, unknown>;
  status: ProviderStatus;
  domains: string[];
  createdAt: string;
  updatedAt: string;
};

export type SsoRoleMapping = {
  id: string;
  providerId: string;
  externalGroup: string;
  internalRole: string;
  createdAt: string;
};

export type ScimSyncRun = {
  id: string;
  providerId: string;
  status: ScimSyncStatus;
  totalUsers: number;
  createdUsers: number;
  updatedUsers: number;
  deactivatedUsers: number;
  errors: string[];
  createdAt: string;
  completedAt: string | null;
};

export type ProvisionedUser = {
  id: string;
  tenantId: string;
  providerId: string;
  externalUserId: string;
  email: string;
  givenName: string | null;
  familyName: string | null;
  active: boolean;
  internalRoles: string[];
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const providers: IdentityProvider[] = [];
const mappings: SsoRoleMapping[] = [];
const runs: ScimSyncRun[] = [];
const users: ProvisionedUser[] = [];

export const ssoService = {
  async createProvider(input: {
    tenantId: string;
    providerType: ProviderType;
    issuer: string;
    metadataJson?: Record<string, unknown>;
    domains?: string[];
  }): Promise<IdentityProvider> {
    const p: IdentityProvider = {
      id: newId(),
      tenantId: input.tenantId,
      providerType: input.providerType,
      issuer: input.issuer,
      metadataJson: input.metadataJson || {},
      status: "active",
      domains: input.domains || [],
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    providers.push(p);
    await publishOutbox({
      id: newId(),
      eventType: "sso.provider.created",
      aggregateId: p.id,
      aggregateType: "identity_provider",
      payload: p,
      occurredAt: nowIso()
    });
    return p;
  },

  suspendProvider(id: string) {
    const p = providers.find((x) => x.id === id);
    if (!p) return null;
    p.status = "suspended";
    p.updatedAt = nowIso();
    return p;
  },

  /** Resolve which IdP claims a given email domain. */
  resolveByDomain(email: string): IdentityProvider | null {
    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain) return null;
    return providers.find((p) => p.status === "active" && p.domains.some((d) => d.toLowerCase() === domain)) || null;
  },

  async addRoleMapping(input: {
    providerId: string;
    externalGroup: string;
    internalRole: string;
  }): Promise<SsoRoleMapping | null> {
    if (!providers.find((p) => p.id === input.providerId)) return null;
    const m: SsoRoleMapping = {
      id: newId(),
      providerId: input.providerId,
      externalGroup: input.externalGroup,
      internalRole: input.internalRole,
      createdAt: nowIso()
    };
    mappings.push(m);
    return m;
  },

  mappingsForProvider: (providerId: string) =>
    mappings.filter((m) => m.providerId === providerId),

  /**
   * Wave 7 SCIM sync simulator. Walks the supplied user payload, JIT-creates
   * or updates ProvisionedUsers, applies role mappings, and returns a run
   * summary. Wave 8 will wire a real SCIM endpoint surface.
   */
  async runScimSync(input: {
    providerId: string;
    payload: ScimUserPayload[];
  }): Promise<ScimSyncRun | null> {
    const provider = providers.find((p) => p.id === input.providerId);
    if (!provider) return null;
    const providerMappings = mappings.filter((m) => m.providerId === provider.id);

    const run: ScimSyncRun = {
      id: newId(),
      providerId: provider.id,
      status: "running",
      totalUsers: input.payload.length,
      createdUsers: 0,
      updatedUsers: 0,
      deactivatedUsers: 0,
      errors: [],
      createdAt: nowIso(),
      completedAt: null
    };
    runs.push(run);

    for (const user of input.payload) {
      try {
        const internalRoles = resolveInternalRoles(user.groups, providerMappings);
        const existing = users.find(
          (u) => u.providerId === provider.id && u.externalUserId === user.externalUserId
        );
        if (existing) {
          existing.email = user.email;
          existing.givenName = user.givenName || null;
          existing.familyName = user.familyName || null;
          existing.active = user.active;
          existing.internalRoles = internalRoles;
          existing.updatedAt = nowIso();
          if (!user.active) run.deactivatedUsers += 1;
          else run.updatedUsers += 1;
        } else {
          users.push({
            id: newId(),
            tenantId: provider.tenantId,
            providerId: provider.id,
            externalUserId: user.externalUserId,
            email: user.email,
            givenName: user.givenName || null,
            familyName: user.familyName || null,
            active: user.active,
            internalRoles,
            lastLoginAt: null,
            createdAt: nowIso(),
            updatedAt: nowIso()
          });
          run.createdUsers += 1;
        }
      } catch (err) {
        run.errors.push(`${user.externalUserId}: ${(err as Error).message}`);
      }
    }

    run.status = run.errors.length === 0 ? "succeeded" : (run.errors.length === input.payload.length ? "failed" : "partial");
    run.completedAt = nowIso();

    await publishOutbox({
      id: newId(),
      eventType: "sso.scim.sync.completed",
      aggregateId: run.id,
      aggregateType: "scim_sync_run",
      payload: { runId: run.id, status: run.status, totals: { created: run.createdUsers, updated: run.updatedUsers, deactivated: run.deactivatedUsers } },
      occurredAt: nowIso()
    });
    return run;
  },

  /**
   * Build session claims at SAML/OIDC assertion time. Wave 8 will use the
   * resolved claims to mint a real JWT; Wave 7 just returns a structured payload.
   */
  buildSessionClaims(input: {
    providerId: string;
    claims: SsoSessionClaims;
  }) {
    const provider = providers.find((p) => p.id === input.providerId);
    if (!provider) return null;
    const providerMappings = mappings.filter((m) => m.providerId === provider.id);
    const internalRoles = resolveInternalRoles(input.claims.externalGroups, providerMappings);
    const user = users.find(
      (u) => u.providerId === provider.id && u.externalUserId === input.claims.externalUserId
    );
    if (user) {
      user.lastLoginAt = nowIso();
    }
    return {
      tenantId: provider.tenantId,
      providerId: provider.id,
      email: input.claims.email,
      externalUserId: input.claims.externalUserId,
      internalRoles,
      issuedAt: nowIso()
    };
  },

  listProviders: () => [...providers].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  providersForTenant: (tenantId: string) => providers.filter((p) => p.tenantId === tenantId),
  findProvider: (id: string) => providers.find((p) => p.id === id) || null,
  listRuns: (providerId?: string) =>
    runs.filter((r) => !providerId || r.providerId === providerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  listUsers: (providerId?: string) =>
    users.filter((u) => !providerId || u.providerId === providerId)
};
