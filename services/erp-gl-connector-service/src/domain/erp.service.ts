import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";

const financeBase = () =>
  process.env.FINANCE_EXPORT_SERVICE_URL || "http://localhost:4033";

export type ErpProvider =
  | "netsuite"
  | "quickbooks"
  | "xero"
  | "sap"
  | "oracle_fusion"
  | "generic_csv";

export type ErpProfile = {
  id: string;
  tenantId: string | null;
  provider: ErpProvider;
  name: string;
  mappingJson: Record<string, unknown>;
  status: "active" | "suspended" | "archived";
  createdAt: string;
  updatedAt: string;
};

export type ErpExportType =
  | "journal_entries"
  | "invoices"
  | "payouts"
  | "tax_summaries"
  | "royalty_statements";

export type ErpExportStatus = "queued" | "ready" | "delivered" | "acked" | "rejected" | "failed";

export type ErpExport = {
  id: string;
  profileId: string;
  exportType: ErpExportType;
  batchKey: string;
  sourceExportPackageId: string | null;
  status: ErpExportStatus;
  outputUri: string | null;
  rowCount: number;
  createdAt: string;
  completedAt: string | null;
};

export type ErpAckEvent = {
  id: string;
  exportId: string;
  status: "accepted" | "partially_accepted" | "rejected";
  acceptedRows: number;
  rejectedRows: number;
  exceptionLines: Array<{ row: number; reason: string }>;
  payloadJson: Record<string, unknown>;
  createdAt: string;
};

const profiles: ErpProfile[] = [];
const exports: ErpExport[] = [];
const acks: ErpAckEvent[] = [];

export const erpService = {
  async createProfile(input: {
    tenantId?: string;
    provider: ErpProvider;
    name: string;
    mappingJson?: Record<string, unknown>;
  }): Promise<ErpProfile> {
    const p: ErpProfile = {
      id: newId(),
      tenantId: input.tenantId || null,
      provider: input.provider,
      name: input.name,
      mappingJson: input.mappingJson || {},
      status: "active",
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    profiles.push(p);
    await publishOutbox({
      id: newId(),
      eventType: "erp.profile.created",
      aggregateId: p.id,
      aggregateType: "erp_profile",
      payload: p,
      occurredAt: nowIso()
    });
    return p;
  },

  listProfiles: () => [...profiles],
  findProfile: (id: string) => profiles.find((p) => p.id === id) || null,

  /**
   * Push an export through the connector. Wave 7 keeps everything
   * deterministic: enqueues an export record, calls finance-export-service to
   * pull the source CSV body, then marks delivered. Wave 8 wires real ERP SDKs.
   */
  async pushExport(input: {
    profileId: string;
    exportType: ErpExportType;
    sourceExportPackageId?: string;
    batchKey?: string;
  }): Promise<ErpExport | null> {
    const profile = profiles.find((p) => p.id === input.profileId);
    if (!profile) return null;
    const e: ErpExport = {
      id: newId(),
      profileId: profile.id,
      exportType: input.exportType,
      batchKey: input.batchKey || `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      sourceExportPackageId: input.sourceExportPackageId || null,
      status: "queued",
      outputUri: null,
      rowCount: 0,
      createdAt: nowIso(),
      completedAt: null
    };
    exports.push(e);

    // Hydrate row count from finance-export-service when source provided.
    if (input.sourceExportPackageId) {
      try {
        const res = await fetch(`${financeBase()}/finance/exports/${input.sourceExportPackageId}`);
        if (res.ok) {
          const pkg = (await res.json()) as { csvBody?: string | null };
          if (pkg.csvBody) {
            e.rowCount = Math.max(0, pkg.csvBody.split("\n").length - 1);
          }
        }
      } catch { /* ignore — leaves rowCount at 0 */ }
    }

    e.outputUri = `s3://crownx-erp/${profile.provider}/${e.batchKey}.csv`;
    e.status = "delivered";
    e.completedAt = nowIso();

    await publishOutbox({
      id: newId(),
      eventType: "erp.export.delivered",
      aggregateId: e.id,
      aggregateType: "erp_export",
      payload: e,
      occurredAt: nowIso()
    });
    return e;
  },

  /** Inbound ERP acknowledgement / reconciliation feedback. */
  async receiveAck(input: {
    exportId: string;
    status: "accepted" | "partially_accepted" | "rejected";
    acceptedRows?: number;
    rejectedRows?: number;
    exceptionLines?: Array<{ row: number; reason: string }>;
    payloadJson?: Record<string, unknown>;
  }): Promise<ErpAckEvent | null> {
    const exp = exports.find((x) => x.id === input.exportId);
    if (!exp) return null;
    const ack: ErpAckEvent = {
      id: newId(),
      exportId: exp.id,
      status: input.status,
      acceptedRows: input.acceptedRows || 0,
      rejectedRows: input.rejectedRows || 0,
      exceptionLines: input.exceptionLines || [],
      payloadJson: input.payloadJson || {},
      createdAt: nowIso()
    };
    acks.push(ack);

    // Update export status from ack
    if (ack.status === "accepted") exp.status = "acked";
    else if (ack.status === "rejected") exp.status = "rejected";
    else exp.status = "acked";

    await publishOutbox({
      id: newId(),
      eventType: "erp.ack.received",
      aggregateId: ack.id,
      aggregateType: "erp_ack",
      payload: ack,
      occurredAt: nowIso()
    });
    return ack;
  },

  listExports: () => [...exports].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  exportsForProfile: (profileId: string) => exports.filter((e) => e.profileId === profileId),
  findExport: (id: string) => exports.find((e) => e.id === id) || null,
  acksForExport: (exportId: string) => acks.filter((a) => a.exportId === exportId)
};
