import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import { mockPartnerAdapter, type PartnerType } from "@crownx-jewel/shared-partners";
import { partnerRepo, type Partner, type PartnerInventoryRecord } from "../repo/partner.repo";

export const partnerService = {
  async create(input: {
    partnerType: PartnerType;
    name: string;
    configJson?: Record<string, unknown>;
    tenantId?: string;
  }): Promise<Partner> {
    const p: Partner = {
      id: newId(),
      partnerType: input.partnerType,
      name: input.name,
      status: "active",
      credentialRef: `cred_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      configJson: input.configJson || {},
      tenantId: input.tenantId || null,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    partnerRepo.insert(p);
    await publishOutbox({
      id: newId(),
      eventType: "partner.created",
      aggregateId: p.id,
      aggregateType: "partner",
      payload: p,
      occurredAt: nowIso()
    });
    return p;
  },

  suspend(id: string) {
    return partnerRepo.update(id, { status: "suspended", updatedAt: nowIso() });
  },
  archive(id: string) {
    return partnerRepo.update(id, { status: "archived", updatedAt: nowIso() });
  },

  /**
   * Wave 6 inventory sync: fetches a page from the partner adapter, then
   * reconciles each item against existing inventory. Wave 7 wires the real
   * provider adapter; Wave 6 always uses the mock.
   */
  async syncInventory(partnerId: string, cursor?: string) {
    const partner = partnerRepo.findById(partnerId);
    if (!partner) return null;

    const { items, nextCursor } = await mockPartnerAdapter.fetchInventory({ partnerId, cursor });

    let matched = 0;
    let candidate = 0;
    for (const item of items) {
      const existing = partnerRepo.findInventoryByExternal(partnerId, item.externalItemId);
      if (existing) {
        partnerRepo.updateInventory(existing.id, {
          payloadJson: { ...existing.payloadJson, ...item.provenancePayload },
          updatedAt: nowIso()
        });
        matched += 1;
        continue;
      }
      const record: PartnerInventoryRecord = {
        id: newId(),
        partnerId,
        externalItemId: item.externalItemId,
        externalLotId: item.externalLotId || null,
        mappedAssetId: null,
        syncState: "candidate",
        payloadJson: {
          title: item.title,
          category: item.category,
          price: item.price,
          provenance: item.provenancePayload || {}
        },
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      partnerRepo.insertInventory(record);
      candidate += 1;
    }

    await publishOutbox({
      id: newId(),
      eventType: "partner.inventory.synced",
      aggregateId: partnerId,
      aggregateType: "partner",
      payload: { partnerId, fetched: items.length, matched, candidate, nextCursor },
      occurredAt: nowIso()
    });

    return { fetched: items.length, matched, candidate, nextCursor };
  },

  /** Map a candidate inventory record onto an existing internal asset. */
  async mapInventory(partnerInventoryId: string, mappedAssetId: string) {
    const record = partnerRepo.updateInventory(partnerInventoryId, {
      mappedAssetId,
      syncState: "matched",
      updatedAt: nowIso()
    });
    if (record) {
      await publishOutbox({
        id: newId(),
        eventType: "partner.inventory.mapped",
        aggregateId: record.id,
        aggregateType: "partner_inventory",
        payload: { partnerInventoryId, mappedAssetId },
        occurredAt: nowIso()
      });
    }
    return record;
  },

  rejectInventory(partnerInventoryId: string, reason: string) {
    return partnerRepo.updateInventory(partnerInventoryId, {
      syncState: "rejected",
      payloadJson: { ...(partnerRepo.inventoryFor("").find((x) => x.id === partnerInventoryId)?.payloadJson || {}), rejectReason: reason },
      updatedAt: nowIso()
    });
  },

  /** Receive an inbound partner webhook. */
  async receiveWebhook(input: {
    partnerId: string;
    eventType: string;
    payloadJson: Record<string, unknown>;
  }) {
    const partner = partnerRepo.findById(input.partnerId);
    if (!partner) return null;
    const w = partnerRepo.insertWebhook({
      id: newId(),
      partnerId: input.partnerId,
      eventType: input.eventType,
      payloadJson: input.payloadJson,
      status: "received",
      createdAt: nowIso()
    });
    await publishOutbox({
      id: newId(),
      eventType: "partner.webhook.received",
      aggregateId: w.id,
      aggregateType: "partner_webhook",
      payload: w,
      occurredAt: nowIso()
    });
    return w;
  },

  /** Push a settlement-status callback to the partner (mock acknowledged). */
  async syndicateSettlementStatus(input: {
    partnerId: string;
    externalItemId: string;
    status: string;
    payload?: Record<string, unknown>;
  }) {
    return mockPartnerAdapter.pushSettlementStatus(input);
  },

  list: () => partnerRepo.list(),
  byTenant: (t: string) => partnerRepo.byTenant(t),
  findById: (id: string) => partnerRepo.findById(id),
  inventoryFor: (id: string) => partnerRepo.inventoryFor(id),
  webhooksFor: (id: string) => partnerRepo.webhooksFor(id)
};
