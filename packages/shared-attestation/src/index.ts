/**
 * Wave 11 sovereign attestation export primitives. Tamper-evident
 * manifest construction, packet integrity hash, externally-reviewable
 * trust receipt building.
 *
 * Wave 11 ships an in-process deterministic hash (no real signing keys);
 * Wave 12 swaps in a real attestation-verification-service that
 * cross-checks signatures against a public verifier endpoint.
 */
export type AttestationPacketType =
  | "tenant_period_summary"
  | "key_usage_chain"
  | "control_summary"
  | "audit_bundle"
  | "regulator_disclosure";

export type AttestationPacketStatus = "draft" | "assembled" | "signed" | "exported" | "revoked";

export type ExportTargetType =
  | "external_auditor"
  | "regulator_authority"
  | "partner_review"
  | "internal_archive"
  | "tenant_self_service";

export type ExportApprovalStatus = "pending" | "approved" | "denied" | "revoked";

export type AttestationManifest = {
  packetType: AttestationPacketType;
  tenantId: string;
  /** ISO period covered by the packet — month/quarter/year. */
  periodKey: string;
  /** List of source records with reference type + id + content digest. */
  sources: Array<{
    referenceType: string;
    referenceId: string;
    contentDigest: string;
  }>;
  /** Stable ordered concatenation digest covering every source. */
  manifestDigest: string;
  /** Tamper-evident chain hash referencing prior packet manifestDigest, if any. */
  priorManifestDigest: string | null;
  generatedAt: string;
};

/** Compute a stable digest for a string (deterministic FNV-1a-like). */
export function computeContentDigest(content: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < content.length; i++) {
    h ^= content.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `d_${(h >>> 0).toString(36)}`;
}

/**
 * Build a tamper-evident manifest by concatenating source digests in a
 * stable order and hashing them with the optional prior chain digest.
 */
export function buildManifest(input: {
  packetType: AttestationPacketType;
  tenantId: string;
  periodKey: string;
  sources: Array<{ referenceType: string; referenceId: string; content: string }>;
  priorManifestDigest?: string;
}): AttestationManifest {
  const sources = input.sources
    .map((s) => ({
      referenceType: s.referenceType,
      referenceId: s.referenceId,
      contentDigest: computeContentDigest(s.content)
    }))
    .sort((a, b) =>
      `${a.referenceType}:${a.referenceId}`.localeCompare(`${b.referenceType}:${b.referenceId}`)
    );

  const concatRaw = sources.map((s) => `${s.referenceType}:${s.referenceId}:${s.contentDigest}`).join("|");
  const chained = input.priorManifestDigest ? `${input.priorManifestDigest}|${concatRaw}` : concatRaw;
  const manifestDigest = computeContentDigest(`${input.packetType}|${input.tenantId}|${input.periodKey}|${chained}`);

  return {
    packetType: input.packetType,
    tenantId: input.tenantId,
    periodKey: input.periodKey,
    sources,
    manifestDigest,
    priorManifestDigest: input.priorManifestDigest || null,
    generatedAt: new Date().toISOString()
  };
}

/** Verify an existing manifest by re-deriving the digest from supplied content. */
export function verifyManifest(manifest: AttestationManifest, content: Map<string, string>): {
  valid: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  for (const s of manifest.sources) {
    const key = `${s.referenceType}:${s.referenceId}`;
    const c = content.get(key);
    if (c === undefined) {
      reasons.push(`missing content for ${key}`);
      continue;
    }
    const expected = computeContentDigest(c);
    if (expected !== s.contentDigest) {
      reasons.push(`digest mismatch for ${key}`);
    }
  }
  return { valid: reasons.length === 0, reasons };
}

export type ExportReceipt = {
  receiptId: string;
  exportedAt: string;
  exportTargetType: ExportTargetType;
  /** Link to the receiving party (auditor org id, regulator id, etc.). */
  exportTargetId: string | null;
  /** External verification URL (Wave 12 wires real verifier). */
  externalVerificationUri: string | null;
  notes: string;
};

export function buildExportReceipt(input: {
  packetId: string;
  exportTargetType: ExportTargetType;
  exportTargetId?: string;
  notes?: string;
}): ExportReceipt {
  const ts = Date.now();
  const seed = `${input.packetId}|${input.exportTargetType}|${ts}`;
  return {
    receiptId: `exp_${computeContentDigest(seed).slice(2)}`,
    exportedAt: new Date(ts).toISOString(),
    exportTargetType: input.exportTargetType,
    exportTargetId: input.exportTargetId || null,
    externalVerificationUri: null,
    notes: input.notes || ""
  };
}
