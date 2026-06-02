import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import {
  buildExportReceipt,
  buildManifest,
  verifyManifest,
  type AttestationManifest,
  type AttestationPacketStatus,
  type AttestationPacketType,
  type ExportApprovalStatus,
  type ExportReceipt,
  type ExportTargetType
} from "@crownx-jewel/shared-attestation";

const custodyBase = () => process.env.SOVEREIGN_KEY_CUSTODY_SERVICE_URL || "http://localhost:4060";
const sovereignBase = () => process.env.SOVEREIGN_DEPLOYMENT_SERVICE_URL || "http://localhost:4053";
const legalPacketBase = () => process.env.LEGAL_PACKET_SERVICE_URL || "http://localhost:4042";

export type SovereignAttestationPacket = {
  id: string;
  tenantId: string;
  packetType: AttestationPacketType;
  periodKey: string;
  status: AttestationPacketStatus;
  manifest: AttestationManifest;
  outputUri: string | null;
  /** Optional legal-packet wrapper id when the export is wrapped for external review. */
  legalPacketId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SovereignAttestationExport = {
  id: string;
  packetId: string;
  exportTargetType: ExportTargetType;
  exportTargetId: string | null;
  approvalStatus: ExportApprovalStatus;
  approverUserId: string | null;
  receipt: ExportReceipt | null;
  externalVerificationUri: string | null;
  createdAt: string;
  updatedAt: string;
};

const packets: SovereignAttestationPacket[] = [];
const exports_: SovereignAttestationExport[] = [];

async function fetchOk<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

async function postOk<T>(url: string, body: unknown): Promise<T | null> {
  try {
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

/** Find the most recent packet for a tenant of the same type — used for chained manifest digests. */
function priorPacketDigest(tenantId: string, packetType: AttestationPacketType): string | undefined {
  const prior = packets
    .filter((p) => p.tenantId === tenantId && p.packetType === packetType)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  return prior?.manifest.manifestDigest;
}

export const attestationExportService = {
  /**
   * Assemble an attestation packet by pulling source records from upstream
   * services. Sources vary by packet type:
   *  - tenant_period_summary: custody profile + recent attestations + sovereign assignment
   *  - key_usage_chain: custody attestations for the period
   *  - control_summary: sovereign export evaluations + custody policy
   *  - audit_bundle: all of the above plus optional legal-packet wrap
   *  - regulator_disclosure: control summary + regulator-notice references
   */
  async assemble(input: {
    tenantId: string;
    packetType: AttestationPacketType;
    periodKey: string;
    /** Optional caller-supplied source content overrides. */
    sourceOverrides?: Array<{ referenceType: string; referenceId: string; content: string }>;
    wrapInLegalPacket?: boolean;
  }): Promise<SovereignAttestationPacket> {
    let sources = input.sourceOverrides ? [...input.sourceOverrides] : [];
    if (sources.length === 0) {
      // Best-effort: pull custody profile + recent attestations for this tenant
      const profile = await fetchOk<{ id: string; custodyMode: string; regionKey: string }>(
        `${custodyBase()}/custody/profiles/by-tenant/${input.tenantId}`
      );
      if (profile) sources.push({
        referenceType: "custody_profile",
        referenceId: profile.id,
        content: JSON.stringify(profile)
      });

      const atts = await fetchOk<Array<{ id: string; receiptId: string; controlState: string; createdAt: string }>>(
        `${custodyBase()}/custody/attestations?limit=50`
      );
      if (atts) {
        for (const a of atts.slice(0, 50)) {
          sources.push({
            referenceType: "custody_attestation",
            referenceId: a.id,
            content: `${a.receiptId}|${a.controlState}|${a.createdAt}`
          });
        }
      }

      const assignment = await fetchOk<{ id: string; classKey: string; status: string }>(
        `${sovereignBase()}/sovereign/assignments/by-tenant/${input.tenantId}`
      );
      if (assignment) sources.push({
        referenceType: "sovereign_assignment",
        referenceId: assignment.id,
        content: `${assignment.classKey}|${assignment.status}`
      });
    }

    const manifest = buildManifest({
      packetType: input.packetType,
      tenantId: input.tenantId,
      periodKey: input.periodKey,
      sources,
      priorManifestDigest: priorPacketDigest(input.tenantId, input.packetType)
    });

    let legalPacketId: string | null = null;
    if (input.wrapInLegalPacket) {
      const lp = await postOk<{ id: string }>(
        `${legalPacketBase()}/legal-packets`,
        {
          packetType: "attestation_external",
          subjectType: "sovereign_attestation",
          subjectId: manifest.manifestDigest,
          severity: "regulator_sensitive"
        }
      );
      if (lp) legalPacketId = lp.id;
    }

    const p: SovereignAttestationPacket = {
      id: newId(),
      tenantId: input.tenantId,
      packetType: input.packetType,
      periodKey: input.periodKey,
      status: "assembled",
      manifest,
      outputUri: `s3://crownx-attestation-export/${input.tenantId}/${input.periodKey}/${input.packetType}.json`,
      legalPacketId,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    packets.push(p);
    await publishOutbox({
      id: newId(),
      eventType: "attestation.packet.assembled",
      aggregateId: p.id,
      aggregateType: "attestation_packet",
      payload: { id: p.id, tenantId: p.tenantId, packetType: p.packetType, manifestDigest: manifest.manifestDigest, sourceCount: sources.length },
      occurredAt: nowIso()
    });
    return p;
  },

  signPacket(id: string) {
    const p = packets.find((x) => x.id === id);
    if (!p) return null;
    if (p.status !== "assembled") return p;
    p.status = "signed";
    p.updatedAt = nowIso();
    return p;
  },

  revokePacket(id: string) {
    const p = packets.find((x) => x.id === id);
    if (!p) return null;
    p.status = "revoked";
    p.updatedAt = nowIso();
    return p;
  },

  /** Verify a packet against caller-supplied source content. */
  verifyPacket(id: string, content: Map<string, string>) {
    const p = packets.find((x) => x.id === id);
    if (!p) return null;
    return verifyManifest(p.manifest, content);
  },

  /**
   * Request an export of a signed packet to an external target. Stays
   * pending until an authorized approver runs `/exports/:id/approve`.
   * Wave 12 will plug in attestation-verification-service.
   */
  async requestExport(input: {
    packetId: string;
    exportTargetType: ExportTargetType;
    exportTargetId?: string;
  }): Promise<SovereignAttestationExport | null> {
    const p = packets.find((x) => x.id === input.packetId);
    if (!p) return null;
    if (p.status !== "signed") return null;
    const e: SovereignAttestationExport = {
      id: newId(),
      packetId: p.id,
      exportTargetType: input.exportTargetType,
      exportTargetId: input.exportTargetId || null,
      approvalStatus: "pending",
      approverUserId: null,
      receipt: null,
      externalVerificationUri: null,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    exports_.push(e);
    return e;
  },

  async approveExport(input: { id: string; approverUserId: string }): Promise<SovereignAttestationExport | null> {
    const e = exports_.find((x) => x.id === input.id);
    if (!e) return null;
    if (e.approvalStatus !== "pending") return e;
    e.approvalStatus = "approved";
    e.approverUserId = input.approverUserId;
    e.receipt = buildExportReceipt({
      packetId: e.packetId,
      exportTargetType: e.exportTargetType,
      exportTargetId: e.exportTargetId || undefined
    });
    // Wave 12 will replace this stub URI with an actual verifier endpoint
    e.externalVerificationUri = `https://verify.crownx.example/${e.receipt.receiptId}`;
    e.updatedAt = nowIso();

    const p = packets.find((x) => x.id === e.packetId);
    if (p && p.status === "signed") {
      p.status = "exported";
      p.updatedAt = nowIso();
    }

    await publishOutbox({
      id: newId(),
      eventType: "attestation.export.approved",
      aggregateId: e.id,
      aggregateType: "attestation_export",
      payload: { id: e.id, packetId: e.packetId, target: e.exportTargetType, receiptId: e.receipt.receiptId },
      occurredAt: nowIso()
    });
    return e;
  },

  denyExport(input: { id: string; approverUserId: string; reason: string }) {
    const e = exports_.find((x) => x.id === input.id);
    if (!e) return null;
    e.approvalStatus = "denied";
    e.approverUserId = input.approverUserId;
    e.updatedAt = nowIso();
    return e;
  },

  // Read APIs
  listPackets: (tenantId?: string, status?: AttestationPacketStatus) =>
    packets
      .filter((p) => (!tenantId || p.tenantId === tenantId) && (!status || p.status === status))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  findPacket: (id: string) => packets.find((p) => p.id === id) || null,
  listExports: (packetId?: string) =>
    exports_.filter((e) => !packetId || e.packetId === packetId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  findExport: (id: string) => exports_.find((e) => e.id === id) || null,
  pendingExports: () => exports_.filter((e) => e.approvalStatus === "pending"),
  pipelineSummary() {
    const byStatus: Record<AttestationPacketStatus, number> = {
      draft: 0, assembled: 0, signed: 0, exported: 0, revoked: 0
    };
    for (const p of packets) byStatus[p.status]++;
    return {
      totalPackets: packets.length,
      byStatus,
      totalExports: exports_.length,
      pendingExports: exports_.filter((e) => e.approvalStatus === "pending").length,
      approvedExports: exports_.filter((e) => e.approvalStatus === "approved").length
    };
  }
};
