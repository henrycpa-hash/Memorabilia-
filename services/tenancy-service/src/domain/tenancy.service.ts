import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import { DEFAULT_FEATURE_FLAGS, type TenantBranding, type TenantSettings } from "@crownx-jewel/shared-tenancy";
import { tenancyRepo, type Tenant } from "../repo/tenant.repo";

export const tenancyService = {
  async create(input: {
    slug: string;
    name: string;
    branding?: Partial<TenantBranding>;
    settings?: Partial<TenantSettings>;
  }): Promise<Tenant | null> {
    if (tenancyRepo.findBySlug(input.slug)) return null;
    const t: Tenant = {
      id: newId(),
      slug: input.slug,
      name: input.name,
      status: "active",
      branding: {
        displayName: input.branding?.displayName || input.name,
        primaryColor: input.branding?.primaryColor,
        secondaryColor: input.branding?.secondaryColor,
        logoUrl: input.branding?.logoUrl,
        faviconUrl: input.branding?.faviconUrl,
        customDomain: input.branding?.customDomain
      },
      settings: {
        defaultCurrency: input.settings?.defaultCurrency || "USD",
        timeZone: input.settings?.timeZone || "America/Chicago",
        defaultLocale: input.settings?.defaultLocale || "en-US",
        policyPackId: input.settings?.policyPackId,
        enabledChannels: input.settings?.enabledChannels || ["twitter", "instagram", "tiktok"]
      },
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    tenancyRepo.insert(t);

    // Seed default feature flags
    for (const [key, enabled] of Object.entries(DEFAULT_FEATURE_FLAGS)) {
      tenancyRepo.upsertFlag({
        id: newId(),
        tenantId: t.id,
        flagKey: key,
        enabled,
        updatedAt: nowIso()
      });
    }

    await publishOutbox({
      id: newId(),
      eventType: "tenancy.tenant.created",
      aggregateId: t.id,
      aggregateType: "tenant",
      payload: t,
      occurredAt: nowIso()
    });

    return t;
  },

  updateBranding(id: string, branding: Partial<TenantBranding>) {
    const t = tenancyRepo.findById(id);
    if (!t) return null;
    return tenancyRepo.update(id, {
      branding: { ...t.branding, ...branding },
      updatedAt: nowIso()
    });
  },

  updateSettings(id: string, settings: Partial<TenantSettings>) {
    const t = tenancyRepo.findById(id);
    if (!t) return null;
    return tenancyRepo.update(id, {
      settings: { ...t.settings, ...settings },
      updatedAt: nowIso()
    });
  },

  setFlag(tenantId: string, flagKey: string, enabled: boolean) {
    return tenancyRepo.upsertFlag({
      id: newId(),
      tenantId,
      flagKey,
      enabled,
      updatedAt: nowIso()
    });
  },

  flagsFor(tenantId: string) {
    const stored = tenancyRepo.flagsForTenant(tenantId);
    // Merge defaults so unset flags resolve to their default value.
    const map: Record<string, boolean> = { ...DEFAULT_FEATURE_FLAGS };
    for (const f of stored) map[f.flagKey] = f.enabled;
    return map;
  },

  async assignPolicy(tenantId: string, policyPackId: string, scope: "platform" | "campaigns" | "social" | "partner_listings") {
    const t = tenancyRepo.findById(tenantId);
    if (!t) return null;
    const p = tenancyRepo.insertPolicy({
      id: newId(),
      tenantId,
      policyPackId,
      scope,
      createdAt: nowIso()
    });
    await publishOutbox({
      id: newId(),
      eventType: "tenancy.policy.assigned",
      aggregateId: p.id,
      aggregateType: "tenant_policy",
      payload: p,
      occurredAt: nowIso()
    });
    return p;
  },

  policiesFor: (id: string) => tenancyRepo.policiesForTenant(id),
  list: () => tenancyRepo.list(),
  findById: (id: string) => tenancyRepo.findById(id),
  findBySlug: (slug: string) => tenancyRepo.findBySlug(slug),
  suspend: (id: string) => tenancyRepo.update(id, { status: "suspended", updatedAt: nowIso() }),
  archive: (id: string) => tenancyRepo.update(id, { status: "archived", updatedAt: nowIso() })
};
