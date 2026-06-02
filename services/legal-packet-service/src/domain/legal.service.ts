import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import {
  defaultManifest,
  type PacketItem,
  type PacketManifest,
  type PacketStatus,
  type PacketType
} from "@crownx-jewel/shared-legal";

const auditBase = () => process.env.AUDIT_SERVICE_URL || "http://localhost:4014";
const settlementBase = () => process.env.SETTLEMENT_SERVICE_URL || "http://localhost:4015";
const shippingBase = () => process.env.SHIPPING_SERVICE_URL || "http://localhost:4023";
const policyBase = () => process.env.POLICY_COMPLIANCE_SERVICE_URL || "http://localhost:4037";
const contractBase = () => process.env.CONTRACT_LIFECYCLE_SERVICE_URL || "http://localhost:4041";
const assetBase = () => process.env.ASSET_SERVICE_URL || "http://localhost:4002";

async function fetchOk<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export type LegalPacket = {
  id: string;
  packetType: PacketType;
  subjectType: string;
  subjectId: string;
  status: PacketStatus;
  manifestJson: PacketManifest;
  items: PacketItem[];
  outputUri: string | null;
  preparedByUserId: string | null;
  createdAt: string;
  completedAt: string | null;
};

const packets: LegalPacket[] = [];

export const legalPacketService = {
  async create(input: {
    packetType: PacketType;
    subjectType: string;
    subjectId: string;
    preparedByUserId?: string;
  }): Promise<LegalPacket> {
    const manifest = defaultManifest({
      packetType: input.packetType,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      preparedAt: nowIso()
    });
    const p: LegalPacket = {
      id: newId(),
      packetType: input.packetType,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      status: "queued",
      manifestJson: manifest,
      items: manifest.index.map((i) => ({ ...i })),
      outputUri: null,
      preparedByUserId: input.preparedByUserId || null,
      createdAt: nowIso(),
      completedAt: null
    };
    packets.push(p);
    await publishOutbox({
      id: newId(),
      eventType: "legal.packet.created",
      aggregateId: p.id,
      aggregateType: "legal_packet",
      payload: { packetId: p.id, packetType: p.packetType, subjectType: p.subjectType, subjectId: p.subjectId },
      occurredAt: nowIso()
    });
    return p;
  },

  /**
   * Wave 7 packet assembly. Pulls from upstream services and fills in each
   * item's payload deterministically. Wave 8 will produce real PDFs.
   */
  async assemble(id: string): Promise<LegalPacket | null> {
    const p = packets.find((x) => x.id === id);
    if (!p) return null;
    p.status = "assembling";

    for (const item of p.items) {
      switch (item.itemType) {
        case "cover_sheet":
          item.payloadJson = { ...p.manifestJson.cover };
          break;
        case "summary":
          item.payloadJson = {
            packetType: p.packetType,
            subjectType: p.subjectType,
            subjectId: p.subjectId
          };
          break;
        case "timeline": {
          if (p.subjectType === "asset") {
            const timeline = await fetchOk<unknown[]>(`${assetBase()}/assets/${p.subjectId}/timeline`);
            item.payloadJson = { entries: timeline || [] };
          }
          break;
        }
        case "audit_summary": {
          const audit = await fetchOk<unknown[]>(
            `${auditBase()}/audit/by-aggregate/${p.subjectType}/${p.subjectId}`
          );
          item.payloadJson = { entries: audit || [] };
          break;
        }
        case "evidence_manifest": {
          if (p.subjectType === "asset") {
            const evidence = await fetchOk<unknown[]>(`${assetBase()}/assets/${p.subjectId}/evidence`);
            item.payloadJson = { evidence: evidence || [] };
          }
          break;
        }
        case "shipment_summary": {
          if (p.subjectType === "settlement") {
            const shipments = await fetchOk<unknown[]>(`${shippingBase()}/shipments/by-settlement/${p.subjectId}`);
            item.payloadJson = { shipments: shipments || [] };
          }
          break;
        }
        case "settlement_summary": {
          if (p.subjectType === "settlement") {
            const settlement = await fetchOk<unknown>(`${settlementBase()}/settlements/${p.subjectId}`);
            item.payloadJson = { settlement };
          }
          break;
        }
        case "policy_evaluation": {
          const evals = await fetchOk<unknown[]>(
            `${policyBase()}/policies/evaluations/by-subject/${p.subjectType}/${p.subjectId}`
          );
          item.payloadJson = { evaluations: evals || [] };
          break;
        }
        case "contract_extract": {
          const agreements = await fetchOk<unknown[]>(
            `${contractBase()}/contracts/agreements`
          );
          item.payloadJson = { agreementCount: (agreements || []).length };
          break;
        }
        case "appendix":
          item.payloadJson = { note: "Appendix reserved for procurement / legal team annotations." };
          break;
      }
    }

    p.outputUri = `s3://crownx-legal/${p.packetType}/${p.id}.json`;
    p.status = "ready";
    p.completedAt = nowIso();

    await publishOutbox({
      id: newId(),
      eventType: "legal.packet.ready",
      aggregateId: p.id,
      aggregateType: "legal_packet",
      payload: { packetId: p.id, packetType: p.packetType, items: p.items.length },
      occurredAt: nowIso()
    });
    return p;
  },

  markDelivered(id: string) {
    const p = packets.find((x) => x.id === id);
    if (!p) return null;
    p.status = "delivered";
    return p;
  },

  list: () => [...packets].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  byType: (t: PacketType) => packets.filter((p) => p.packetType === t),
  bySubject: (subjectType: string, subjectId: string) =>
    packets.filter((p) => p.subjectType === subjectType && p.subjectId === subjectId),
  findById: (id: string) => packets.find((p) => p.id === id) || null
};
