import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import {
  buildAttestationReceipt,
  evaluateSigningPolicy,
  type AttestationReceipt,
  type CustodyMode,
  type CustodyPolicy,
  type CustodyProfileStatus,
  type SigningKeyStatus,
  type SigningKeyType,
  type SigningPolicyEvaluation
} from "@crownx-jewel/shared-custody";

export type CustodyProfile = {
  id: string;
  tenantId: string;
  custodyMode: CustodyMode;
  regionKey: string;
  policy: CustodyPolicy;
  status: CustodyProfileStatus;
  createdAt: string;
  updatedAt: string;
};

export type SigningKey = {
  id: string;
  custodyProfileId: string;
  keyAlias: string;
  regionKey: string;
  keyType: SigningKeyType;
  status: SigningKeyStatus;
  rotatedFromKeyId: string | null;
  createdAt: string;
};

export type SigningEvent = {
  id: string;
  keyId: string;
  custodyProfileId: string;
  referenceType: string;
  referenceId: string;
  callerRegion: string;
  callerRole: string;
  isBreakGlass: boolean;
  evaluation: SigningPolicyEvaluation;
  attestationReceiptId: string | null;
  createdAt: string;
};

export type CustodyAttestation = AttestationReceipt & {
  id: string;
  keyId: string;
  custodyProfileId: string;
  referenceType: string;
  referenceId: string;
  signingEventId: string;
  createdAt: string;
};

const profiles: CustodyProfile[] = [];
const keys: SigningKey[] = [];
const signingEvents: SigningEvent[] = [];
const attestations: CustodyAttestation[] = [];

/** In-window usage counter for daily caps; keyed by signingKey + UTC date. */
function usageInWindow(keyId: string): number {
  const today = new Date().toISOString().slice(0, 10);
  return signingEvents.filter(
    (e) => e.keyId === keyId
      && e.evaluation.decision === "allow"
      && e.createdAt.slice(0, 10) === today
  ).length;
}

export const custodyService = {
  async createProfile(input: {
    tenantId: string;
    custodyMode: CustodyMode;
    regionKey: string;
    policy: CustodyPolicy;
  }): Promise<CustodyProfile> {
    // Suspend any prior active profile for this tenant
    for (const p of profiles) {
      if (p.tenantId === input.tenantId && p.status === "active") {
        p.status = "suspended";
        p.updatedAt = nowIso();
      }
    }
    const p: CustodyProfile = {
      id: newId(),
      tenantId: input.tenantId,
      custodyMode: input.custodyMode,
      regionKey: input.regionKey,
      policy: input.policy,
      status: "active",
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    profiles.push(p);
    await publishOutbox({
      id: newId(),
      eventType: "custody.profile.created",
      aggregateId: p.id,
      aggregateType: "custody_profile",
      payload: { id: p.id, tenantId: p.tenantId, custodyMode: p.custodyMode, regionKey: p.regionKey },
      occurredAt: nowIso()
    });
    return p;
  },

  setProfileStatus(id: string, status: CustodyProfileStatus) {
    const p = profiles.find((x) => x.id === id);
    if (!p) return null;
    p.status = status;
    p.updatedAt = nowIso();
    return p;
  },

  async createKey(input: {
    custodyProfileId: string;
    keyAlias: string;
    regionKey: string;
    keyType: SigningKeyType;
  }): Promise<SigningKey | null> {
    const profile = profiles.find((p) => p.id === input.custodyProfileId);
    if (!profile) return null;
    const k: SigningKey = {
      id: newId(),
      custodyProfileId: profile.id,
      keyAlias: input.keyAlias,
      regionKey: input.regionKey,
      keyType: input.keyType,
      status: "active",
      rotatedFromKeyId: null,
      createdAt: nowIso()
    };
    keys.push(k);
    return k;
  },

  /**
   * Rotate a signing key: mark the old one rotating then retired, and create
   * a fresh key under the same custody profile.
   */
  async rotateKey(oldKeyId: string): Promise<SigningKey | null> {
    const old = keys.find((k) => k.id === oldKeyId);
    if (!old) return null;
    old.status = "rotating";
    const k: SigningKey = {
      id: newId(),
      custodyProfileId: old.custodyProfileId,
      keyAlias: `${old.keyAlias}_v${keys.filter((x) => x.custodyProfileId === old.custodyProfileId).length + 1}`,
      regionKey: old.regionKey,
      keyType: old.keyType,
      status: "active",
      rotatedFromKeyId: old.id,
      createdAt: nowIso()
    };
    keys.push(k);
    old.status = "retired";
    await publishOutbox({
      id: newId(),
      eventType: "custody.key.rotated",
      aggregateId: k.id,
      aggregateType: "signing_key",
      payload: { newKeyId: k.id, oldKeyId: old.id },
      occurredAt: nowIso()
    });
    return k;
  },

  revokeKey(keyId: string) {
    const k = keys.find((x) => x.id === keyId);
    if (!k) return null;
    k.status = "revoked";
    return k;
  },

  /**
   * Evaluate a signing request, persist a signing event, and (if allowed and
   * attestation required) emit an attestation receipt.
   */
  async sign(input: {
    keyId: string;
    referenceType: string;
    referenceId: string;
    callerRegion: string;
    callerRole: string;
    isBreakGlass?: boolean;
  }): Promise<{ event: SigningEvent; attestation: CustodyAttestation | null } | null> {
    const k = keys.find((x) => x.id === input.keyId);
    if (!k) return null;
    if (k.status !== "active") return null;
    const profile = profiles.find((p) => p.id === k.custodyProfileId);
    if (!profile) return null;
    if (profile.status !== "active") return null;

    const evaluation = evaluateSigningPolicy({
      policy: profile.policy,
      referenceType: input.referenceType,
      callerRegion: input.callerRegion,
      callerRole: input.callerRole,
      isBreakGlass: !!input.isBreakGlass,
      usageInWindow: usageInWindow(k.id)
    });

    const event: SigningEvent = {
      id: newId(),
      keyId: k.id,
      custodyProfileId: profile.id,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      callerRegion: input.callerRegion,
      callerRole: input.callerRole,
      isBreakGlass: !!input.isBreakGlass,
      evaluation,
      attestationReceiptId: null,
      createdAt: nowIso()
    };
    signingEvents.push(event);

    let attestation: CustodyAttestation | null = null;
    if (evaluation.decision === "allow" && evaluation.attestationRequired) {
      const receipt = buildAttestationReceipt({
        keyId: k.id,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        controlState: "verified"
      });
      attestation = {
        ...receipt,
        id: newId(),
        keyId: k.id,
        custodyProfileId: profile.id,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        signingEventId: event.id,
        createdAt: nowIso()
      };
      attestations.push(attestation);
      event.attestationReceiptId = attestation.receiptId;
      await publishOutbox({
        id: newId(),
        eventType: "custody.attestation.issued",
        aggregateId: attestation.id,
        aggregateType: "custody_attestation",
        payload: { id: attestation.id, keyId: k.id, referenceType: input.referenceType, referenceId: input.referenceId, controlState: attestation.controlState },
        occurredAt: nowIso()
      });
    }
    if (evaluation.decision === "deny") {
      await publishOutbox({
        id: newId(),
        eventType: "custody.signing.denied",
        aggregateId: event.id,
        aggregateType: "signing_event",
        payload: { eventId: event.id, keyId: k.id, reasons: evaluation.reasons },
        occurredAt: nowIso()
      });
    }
    return { event, attestation };
  },

  // Read APIs
  listProfiles: (tenantId?: string) => profiles.filter((p) => !tenantId || p.tenantId === tenantId),
  findProfile: (id: string) => profiles.find((p) => p.id === id) || null,
  profileForTenant: (tenantId: string) => profiles.find((p) => p.tenantId === tenantId && p.status === "active") || null,
  listKeys: (profileId?: string) => keys.filter((k) => !profileId || k.custodyProfileId === profileId),
  findKey: (id: string) => keys.find((k) => k.id === id) || null,
  listSigningEvents: (limit?: number) => {
    const sorted = [...signingEvents].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return limit ? sorted.slice(0, limit) : sorted;
  },
  signingEventsForKey: (keyId: string) => signingEvents.filter((e) => e.keyId === keyId),
  listAttestations: (limit?: number) => {
    const sorted = [...attestations].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return limit ? sorted.slice(0, limit) : sorted;
  },
  attestationsForReference: (referenceType: string, referenceId: string) =>
    attestations.filter((a) => a.referenceType === referenceType && a.referenceId === referenceId)
};
