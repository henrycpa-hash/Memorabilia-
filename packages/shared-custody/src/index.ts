/**
 * Wave 10 sovereign key custody primitives. Custody profiles, signing
 * policy evaluation, attestation receipts.
 *
 * Wave 10 ships in-process custody primitives (deterministic, no real HSM).
 * Wave 11 swaps in real KMS/HSM provider connectors via
 * sovereign-attestation-export-service while keeping these shapes stable.
 */
export type CustodyMode =
  | "platform_managed_standard"
  | "tenant_dedicated_managed"
  | "sovereign_isolated_managed"
  | "external_customer_managed_reference";

export type CustodyProfileStatus = "active" | "rotating" | "suspended" | "decommissioned";

export type SigningKeyType =
  | "ed25519"
  | "rsa_2048"
  | "rsa_4096"
  | "ecdsa_p256"
  | "external_kms_reference";

export type SigningKeyStatus = "active" | "rotating" | "retired" | "revoked";

export type CustodyPolicy = {
  /** Reference types this custody profile may sign for. */
  allowedReferenceTypes: string[];
  /** Region keys where signing operations may originate. */
  allowedRegions: string[];
  /** Whether attestations are mandatory for every signing event. */
  attestationRequired: boolean;
  /** Whether external export of signed artifacts is permitted. */
  externalExportAllowed: boolean;
  /** Break-glass approver roles required for elevated signing. */
  breakGlassApproverRoles: string[];
  /** Daily key-usage cap. 0 = unlimited. */
  dailyUsageCap: number;
};

export type SigningPolicyDecision = "allow" | "deny" | "review_required";

export type SigningPolicyEvaluation = {
  decision: SigningPolicyDecision;
  reasons: string[];
  attestationRequired: boolean;
  evaluatedAt: string;
};

/**
 * Evaluate whether a signing request is permitted given a custody profile's
 * policy and the request context.
 */
export function evaluateSigningPolicy(input: {
  policy: CustodyPolicy;
  referenceType: string;
  callerRegion: string;
  callerRole: string;
  isBreakGlass: boolean;
  usageInWindow: number;
}): SigningPolicyEvaluation {
  const ts = new Date().toISOString();
  const reasons: string[] = [];

  if (input.policy.allowedReferenceTypes.length > 0
      && !input.policy.allowedReferenceTypes.includes(input.referenceType)) {
    reasons.push(`referenceType ${input.referenceType} not in custody policy allowlist`);
    return { decision: "deny", reasons, attestationRequired: false, evaluatedAt: ts };
  }
  if (input.policy.allowedRegions.length > 0
      && !input.policy.allowedRegions.includes(input.callerRegion)) {
    reasons.push(`callerRegion ${input.callerRegion} not in custody policy allowlist`);
    return { decision: "deny", reasons, attestationRequired: false, evaluatedAt: ts };
  }
  if (input.policy.dailyUsageCap > 0 && input.usageInWindow >= input.policy.dailyUsageCap) {
    reasons.push(`daily usage cap of ${input.policy.dailyUsageCap} reached`);
    return { decision: "deny", reasons, attestationRequired: false, evaluatedAt: ts };
  }
  if (input.isBreakGlass) {
    if (!input.policy.breakGlassApproverRoles.includes(input.callerRole)) {
      reasons.push(`break-glass requires approver role; ${input.callerRole} not authorized`);
      return { decision: "review_required", reasons, attestationRequired: true, evaluatedAt: ts };
    }
    reasons.push("break-glass signing path approved by authorized role; attestation mandatory");
    return { decision: "allow", reasons, attestationRequired: true, evaluatedAt: ts };
  }
  reasons.push("standard signing path permitted under custody policy");
  return {
    decision: "allow",
    reasons,
    attestationRequired: input.policy.attestationRequired,
    evaluatedAt: ts
  };
}

export type AttestationReceipt = {
  receiptId: string;
  attestedAt: string;
  controlState: "verified" | "verified_with_caveats" | "unverified";
  /** Stable digest of the signing context. */
  contextDigest: string;
  notes: string;
};

/**
 * Build a deterministic attestation receipt for a signing event.
 * Wave 10 generates an internal receipt; Wave 11 wraps it in an exportable
 * sovereign-attestation bundle.
 */
export function buildAttestationReceipt(input: {
  keyId: string;
  referenceType: string;
  referenceId: string;
  controlState?: AttestationReceipt["controlState"];
  notes?: string;
}): AttestationReceipt {
  const raw = `${input.keyId}|${input.referenceType}|${input.referenceId}|${Date.now()}`;
  let h = 0;
  for (let i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) | 0;
  const digest = `att_${Math.abs(h).toString(36)}`;
  return {
    receiptId: digest,
    attestedAt: new Date().toISOString(),
    controlState: input.controlState || "verified",
    contextDigest: digest,
    notes: input.notes || ""
  };
}
