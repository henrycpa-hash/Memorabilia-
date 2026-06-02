import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import {
  deriveEnvelopeStatus,
  validateSignerRouting,
  type CallbackType,
  type EnvelopeStatus,
  type SignatureProvider,
  type SignerInput,
  type SignerStatus
} from "@crownx-jewel/shared-signatures";

const contractBase = () => process.env.CONTRACT_LIFECYCLE_SERVICE_URL || "http://localhost:4041";

export type SignatureEnvelope = {
  id: string;
  agreementId: string;
  provider: SignatureProvider;
  providerEnvelopeId: string;
  subject: string;
  status: EnvelopeStatus;
  documentRef: string | null;
  signedArtifactUri: string | null;
  createdByUserId: string | null;
  createdAt: string;
  completedAt: string | null;
};

export type SignatureSigner = {
  id: string;
  envelopeId: string;
  signerName: string;
  signerEmail: string;
  signerRole: SignerInput["signerRole"];
  signingOrder: number;
  status: SignerStatus;
  signedAt: string | null;
  createdAt: string;
};

export type SignatureCallback = {
  id: string;
  envelopeId: string;
  callbackType: CallbackType;
  payloadJson: Record<string, unknown>;
  createdAt: string;
};

const envelopes: SignatureEnvelope[] = [];
const signers: SignatureSigner[] = [];
const callbacks: SignatureCallback[] = [];

async function notifyContractOfSignature(agreementId: string) {
  try {
    await fetch(`${contractBase()}/contracts/agreements/${agreementId}/sign`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: process.env.SIGNATURE_TO_CONTRACT_TOKEN || "" }
    });
  } catch {
    /* contract service may be unreachable in tests; envelope completion still recorded */
  }
}

export const signatureService = {
  async createEnvelope(input: {
    agreementId: string;
    provider: SignatureProvider;
    subject: string;
    documentRef?: string;
    signers: SignerInput[];
    createdByUserId?: string;
  }): Promise<{ envelope: SignatureEnvelope; signers: SignatureSigner[] } | { error: string }> {
    const valid = validateSignerRouting(input.signers);
    if (!valid.ok) return { error: valid.error || "invalid_signers" };

    const env: SignatureEnvelope = {
      id: newId(),
      agreementId: input.agreementId,
      provider: input.provider,
      providerEnvelopeId: `${input.provider}_${newId().slice(0, 12)}`,
      subject: input.subject,
      status: "draft",
      documentRef: input.documentRef || null,
      signedArtifactUri: null,
      createdByUserId: input.createdByUserId || null,
      createdAt: nowIso(),
      completedAt: null
    };
    envelopes.push(env);

    const created: SignatureSigner[] = input.signers.map((s) => ({
      id: newId(),
      envelopeId: env.id,
      signerName: s.signerName,
      signerEmail: s.signerEmail,
      signerRole: s.signerRole,
      signingOrder: s.signingOrder,
      status: "pending",
      signedAt: null,
      createdAt: nowIso()
    }));
    signers.push(...created);

    await publishOutbox({
      id: newId(),
      eventType: "signature.envelope.created",
      aggregateId: env.id,
      aggregateType: "signature_envelope",
      payload: { envelopeId: env.id, agreementId: env.agreementId, provider: env.provider, signerCount: created.length },
      occurredAt: nowIso()
    });

    return { envelope: env, signers: created };
  },

  /** Move envelope from draft -> sent and notify signers (simulation). */
  async sendEnvelope(envelopeId: string): Promise<SignatureEnvelope | null> {
    const env = envelopes.find((x) => x.id === envelopeId);
    if (!env) return null;
    if (env.status !== "draft") return env;
    env.status = "sent";
    for (const s of signers.filter((x) => x.envelopeId === env.id)) {
      s.status = "notified";
    }
    await this.recordCallback({ envelopeId: env.id, callbackType: "envelope_sent", payload: {} });
    return env;
  },

  /**
   * Webhook ingestion path. Each callback updates signer / envelope state and
   * propagates terminal events (completed) to contract-lifecycle-service.
   */
  async recordCallback(input: {
    envelopeId: string;
    callbackType: CallbackType;
    payload?: Record<string, unknown>;
    signerEmail?: string;
  }): Promise<{ envelope: SignatureEnvelope; callback: SignatureCallback } | null> {
    const env = envelopes.find((x) => x.id === input.envelopeId);
    if (!env) return null;
    const cb: SignatureCallback = {
      id: newId(),
      envelopeId: env.id,
      callbackType: input.callbackType,
      payloadJson: input.payload || {},
      createdAt: nowIso()
    };
    callbacks.push(cb);

    // Apply state transitions
    if (input.callbackType === "signer_signed" && input.signerEmail) {
      const s = signers.find((x) => x.envelopeId === env.id && x.signerEmail === input.signerEmail);
      if (s) { s.status = "signed"; s.signedAt = nowIso(); }
    }
    if (input.callbackType === "signer_declined" && input.signerEmail) {
      const s = signers.find((x) => x.envelopeId === env.id && x.signerEmail === input.signerEmail);
      if (s) { s.status = "declined"; }
    }
    if (input.callbackType === "envelope_voided") env.status = "voided";
    if (input.callbackType === "envelope_expired") env.status = "expired";

    // Re-derive envelope status from signers
    const states = signers.filter((x) => x.envelopeId === env.id).map((x) => x.status);
    const next = deriveEnvelopeStatus(env.status, states);
    if (next !== env.status) {
      env.status = next;
      if (next === "completed") {
        env.completedAt = nowIso();
        env.signedArtifactUri = `s3://crownx-signatures/${env.provider}/${env.id}.pdf`;
        await publishOutbox({
          id: newId(),
          eventType: "signature.envelope.completed",
          aggregateId: env.id,
          aggregateType: "signature_envelope",
          payload: { envelopeId: env.id, agreementId: env.agreementId, signedArtifactUri: env.signedArtifactUri },
          occurredAt: nowIso()
        });
        await notifyContractOfSignature(env.agreementId);
      }
    }

    return { envelope: env, callback: cb };
  },

  voidEnvelope(envelopeId: string) {
    const env = envelopes.find((x) => x.id === envelopeId);
    if (!env) return null;
    env.status = "voided";
    return env;
  },

  list: () => [...envelopes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  byAgreement: (agreementId: string) => envelopes.filter((e) => e.agreementId === agreementId),
  findById: (id: string) => envelopes.find((e) => e.id === id) || null,
  signersFor: (envelopeId: string) => signers.filter((s) => s.envelopeId === envelopeId).sort((a, b) => a.signingOrder - b.signingOrder),
  callbacksFor: (envelopeId: string) => callbacks.filter((c) => c.envelopeId === envelopeId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
};
