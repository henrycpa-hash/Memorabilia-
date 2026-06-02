/**
 * Wave 8 e-signature primitives. Envelopes, signers, callback events.
 *
 * Wave 8 is a deterministic provider simulator (DocuSign / Adobe Sign /
 * HelloSign / native shapes); Wave 9 wires real provider SDKs.
 */
export type SignatureProvider = "docusign" | "adobe_sign" | "hellosign" | "dropbox_sign" | "native";

export type EnvelopeStatus =
  | "draft"
  | "sent"
  | "in_progress"
  | "completed"
  | "voided"
  | "declined"
  | "expired";

export type SignerStatus = "pending" | "notified" | "signed" | "declined" | "delegated";

export type CallbackType =
  | "envelope_sent"
  | "signer_viewed"
  | "signer_signed"
  | "signer_declined"
  | "envelope_completed"
  | "envelope_voided"
  | "envelope_expired";

export type SignerInput = {
  signerName: string;
  signerEmail: string;
  signerRole: "initial_signer" | "counter_signer" | "approver" | "witness";
  signingOrder: number;
};

/**
 * Validate signer routing: signing order must be a contiguous 1..N sequence.
 * Required for sequential signing flows; parallel flows can pass identical
 * orders.
 */
export function validateSignerRouting(signers: SignerInput[]): { ok: boolean; error?: string } {
  if (signers.length === 0) return { ok: false, error: "no_signers" };
  const orders = signers.map((s) => s.signingOrder).sort((a, b) => a - b);
  if (orders[0] < 1) return { ok: false, error: "signing_order_must_start_at_1" };
  return { ok: true };
}

/** Decide if envelope status should advance based on its signers' state. */
export function deriveEnvelopeStatus(
  current: EnvelopeStatus,
  signerStates: SignerStatus[]
): EnvelopeStatus {
  if (current === "voided" || current === "expired" || current === "declined") return current;
  if (signerStates.length === 0) return current;
  if (signerStates.some((s) => s === "declined")) return "declined";
  if (signerStates.every((s) => s === "signed")) return "completed";
  if (signerStates.some((s) => s === "signed" || s === "notified")) return "in_progress";
  return current;
}
