import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";

const legalPacketBase = () => process.env.LEGAL_PACKET_SERVICE_URL || "http://localhost:4042";

export type LegalProvider =
  | "litera_clm"
  | "ironclad"
  | "icertis"
  | "relativity"
  | "everlaw"
  | "legaltracker"
  | "generic_filesystem";

export type MatterStatus = "open" | "in_review" | "responding" | "closed" | "on_hold";

export type LegalMatter = {
  id: string;
  externalMatterId: string;
  provider: LegalProvider;
  matterTitle: string;
  status: MatterStatus;
  associatedAgreementIds: string[];
  associatedDisputeIds: string[];
  payloadJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type LegalExportStatus = "queued" | "exporting" | "delivered" | "failed";

export type LegalExport = {
  id: string;
  matterId: string | null;
  packetId: string;
  packetType: string;
  provider: LegalProvider;
  status: LegalExportStatus;
  outputUri: string | null;
  externalDocumentId: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
};

export type LegalHoldStatus = "active" | "released";

export type LegalHold = {
  id: string;
  matterId: string;
  custodianIds: string[];
  description: string;
  status: LegalHoldStatus;
  createdAt: string;
  releasedAt: string | null;
};

const matters: LegalMatter[] = [];
const exports: LegalExport[] = [];
const holds: LegalHold[] = [];

async function fetchOk<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export const legalConnectorService = {
  async createMatter(input: {
    externalMatterId: string;
    provider: LegalProvider;
    matterTitle: string;
    associatedAgreementIds?: string[];
    associatedDisputeIds?: string[];
    payloadJson?: Record<string, unknown>;
  }): Promise<LegalMatter> {
    const m: LegalMatter = {
      id: newId(),
      externalMatterId: input.externalMatterId,
      provider: input.provider,
      matterTitle: input.matterTitle,
      status: "open",
      associatedAgreementIds: input.associatedAgreementIds || [],
      associatedDisputeIds: input.associatedDisputeIds || [],
      payloadJson: input.payloadJson || {},
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    matters.push(m);
    await publishOutbox({
      id: newId(),
      eventType: "legal.matter.created",
      aggregateId: m.id,
      aggregateType: "legal_matter",
      payload: m,
      occurredAt: nowIso()
    });
    return m;
  },

  updateMatterStatus(id: string, status: MatterStatus) {
    const m = matters.find((x) => x.id === id);
    if (!m) return null;
    m.status = status;
    m.updatedAt = nowIso();
    return m;
  },

  /**
   * Export an existing legal-packet to the matter via the configured provider.
   * Wave 8 simulates: pulls packet metadata, generates outputUri, marks delivered.
   */
  async exportPacket(input: {
    matterId: string;
    packetId: string;
  }): Promise<LegalExport | null> {
    const matter = matters.find((m) => m.id === input.matterId);
    if (!matter) return null;
    const packet = await fetchOk<{ id: string; packetType: string; status: string }>(
      `${legalPacketBase()}/legal-packets/${input.packetId}`
    );
    if (!packet) return null;

    const exp: LegalExport = {
      id: newId(),
      matterId: matter.id,
      packetId: packet.id,
      packetType: packet.packetType,
      provider: matter.provider,
      status: "exporting",
      outputUri: null,
      externalDocumentId: null,
      errorMessage: null,
      createdAt: nowIso(),
      completedAt: null
    };
    exports.push(exp);

    exp.outputUri = `${matter.provider}://matters/${matter.externalMatterId}/${packet.packetType}_${packet.id}.pdf`;
    exp.externalDocumentId = `${matter.provider}_doc_${newId().slice(0, 12)}`;
    exp.status = "delivered";
    exp.completedAt = nowIso();

    await publishOutbox({
      id: newId(),
      eventType: "legal.packet.exported",
      aggregateId: exp.id,
      aggregateType: "legal_export",
      payload: { exportId: exp.id, matterId: matter.id, packetId: packet.id, externalDocumentId: exp.externalDocumentId },
      occurredAt: nowIso()
    });

    return exp;
  },

  /** Provider-side status callback. Wave 8 supports a simple ack/reject. */
  async ingestStatusCallback(input: {
    exportId: string;
    status: "delivered" | "failed";
    externalDocumentId?: string;
    errorMessage?: string;
  }): Promise<LegalExport | null> {
    const exp = exports.find((x) => x.id === input.exportId);
    if (!exp) return null;
    exp.status = input.status;
    if (input.externalDocumentId) exp.externalDocumentId = input.externalDocumentId;
    if (input.errorMessage) exp.errorMessage = input.errorMessage;
    if (input.status === "delivered") exp.completedAt = nowIso();
    return exp;
  },

  async createHold(input: {
    matterId: string;
    custodianIds: string[];
    description: string;
  }): Promise<LegalHold | null> {
    if (!matters.find((m) => m.id === input.matterId)) return null;
    const h: LegalHold = {
      id: newId(),
      matterId: input.matterId,
      custodianIds: input.custodianIds,
      description: input.description,
      status: "active",
      createdAt: nowIso(),
      releasedAt: null
    };
    holds.push(h);
    await publishOutbox({
      id: newId(),
      eventType: "legal.hold.placed",
      aggregateId: h.id,
      aggregateType: "legal_hold",
      payload: h,
      occurredAt: nowIso()
    });
    return h;
  },

  releaseHold(id: string) {
    const h = holds.find((x) => x.id === id);
    if (!h) return null;
    h.status = "released";
    h.releasedAt = nowIso();
    return h;
  },

  // Read APIs
  listMatters: () => [...matters].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  findMatter: (id: string) => matters.find((m) => m.id === id) || null,
  matterByExternal: (provider: LegalProvider, externalMatterId: string) =>
    matters.find((m) => m.provider === provider && m.externalMatterId === externalMatterId) || null,

  listExports: (matterId?: string) =>
    exports.filter((e) => !matterId || e.matterId === matterId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  findExport: (id: string) => exports.find((e) => e.id === id) || null,

  listHolds: (matterId?: string) =>
    holds.filter((h) => !matterId || h.matterId === matterId),
  activeHolds: () => holds.filter((h) => h.status === "active")
};
