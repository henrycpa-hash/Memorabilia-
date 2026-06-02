import type { PartnerType, PartnerStatus, SyncState } from "@crownx-jewel/shared-partners";

export type Partner = {
  id: string;
  partnerType: PartnerType;
  name: string;
  status: PartnerStatus;
  credentialRef: string | null;
  configJson: Record<string, unknown>;
  tenantId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PartnerInventoryRecord = {
  id: string;
  partnerId: string;
  externalItemId: string;
  externalLotId: string | null;
  mappedAssetId: string | null;
  syncState: SyncState;
  payloadJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type PartnerWebhookEvent = {
  id: string;
  partnerId: string;
  eventType: string;
  payloadJson: Record<string, unknown>;
  status: "received" | "processed" | "failed";
  createdAt: string;
};

const partners: Partner[] = [];
const inventory: PartnerInventoryRecord[] = [];
const webhooks: PartnerWebhookEvent[] = [];

export const partnerRepo = {
  insert(p: Partner) { partners.push(p); return p; },
  findById(id: string) { return partners.find((p) => p.id === id) || null; },
  list() { return [...partners].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); },
  byTenant(tenantId: string) { return partners.filter((p) => p.tenantId === tenantId); },
  update(id: string, patch: Partial<Partner>) {
    const p = partners.find((x) => x.id === id);
    if (p) Object.assign(p, patch);
    return p || null;
  },

  insertInventory(r: PartnerInventoryRecord) { inventory.push(r); return r; },
  inventoryFor(partnerId: string) { return inventory.filter((i) => i.partnerId === partnerId); },
  findInventoryByExternal(partnerId: string, externalItemId: string) {
    return inventory.find((i) => i.partnerId === partnerId && i.externalItemId === externalItemId) || null;
  },
  updateInventory(id: string, patch: Partial<PartnerInventoryRecord>) {
    const r = inventory.find((x) => x.id === id);
    if (r) Object.assign(r, patch);
    return r || null;
  },

  insertWebhook(w: PartnerWebhookEvent) { webhooks.push(w); return w; },
  webhooksFor(partnerId: string) {
    return webhooks
      .filter((w) => w.partnerId === partnerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
};
