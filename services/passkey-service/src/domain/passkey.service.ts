import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} from "@simplewebauthn/server";
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture
} from "@simplewebauthn/server";
import { newId } from "@crownx-jewel/shared-kernel";

/**
 * Real FIDO2 / WebAuthn with @simplewebauthn/server. The biometric never leaves
 * the device — we store ONLY the COSE public key + a monotonic signature
 * counter, and verify the attestation/assertion cryptographically. Credentials
 * are bound to the CrownX origin (phishing-resistant). In-memory store matches
 * the repo convention; the schema is `passkey_credentials`.
 */

const RP_NAME = "CrownX Vault";
const rpID = () => process.env.CROWNX_RP_ID || "localhost";
const expectedOrigin = () => process.env.CROWNX_ORIGIN || "http://localhost:3003";

interface StoredCred {
  id: string;
  publicKey: Uint8Array;
  counter: number;
  transports?: AuthenticatorTransportFuture[];
  userId: string;
  email: string;
}
interface User {
  id: string;
  email: string;
  displayName: string;
}

const users = new Map<string, User>();
const credsByEmail = new Map<string, StoredCred[]>();
const credById = new Map<string, StoredCred>();
const challenges = new Map<string, string>(); // email -> current challenge

function getOrCreateUser(email: string, displayName?: string): User {
  let u = users.get(email);
  if (!u) {
    u = { id: newId(), email, displayName: displayName || email };
    users.set(email, u);
  }
  return u;
}

export interface VerifyResult {
  verified: boolean;
  userId?: string;
  email?: string;
}

export const passkeyService = {
  async registrationOptions(email: string, displayName?: string) {
    const user = getOrCreateUser(email, displayName);
    const existing = credsByEmail.get(email) || [];
    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: rpID(),
      userName: email,
      userDisplayName: user.displayName,
      userID: new TextEncoder().encode(user.id),
      attestationType: "none",
      excludeCredentials: existing.map((c) => ({ id: c.id, transports: c.transports })),
      authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" }
    });
    challenges.set(email, options.challenge);
    return options;
  },

  async registrationVerify(email: string, response: RegistrationResponseJSON): Promise<VerifyResult> {
    const expectedChallenge = challenges.get(email);
    const user = users.get(email);
    if (!expectedChallenge || !user) return { verified: false };
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: expectedOrigin(),
      expectedRPID: rpID()
    });
    if (!verification.verified || !verification.registrationInfo) return { verified: false };
    const cred = verification.registrationInfo.credential;
    const stored: StoredCred = {
      id: cred.id,
      publicKey: cred.publicKey,
      counter: cred.counter,
      transports: response.response.transports,
      userId: user.id,
      email
    };
    const arr = credsByEmail.get(email) || [];
    arr.push(stored);
    credsByEmail.set(email, arr);
    credById.set(cred.id, stored);
    challenges.delete(email);
    return { verified: true, userId: user.id, email };
  },

  async authenticationOptions(email: string) {
    const creds = credsByEmail.get(email) || [];
    const options = await generateAuthenticationOptions({
      rpID: rpID(),
      allowCredentials: creds.map((c) => ({ id: c.id, transports: c.transports })),
      userVerification: "preferred"
    });
    challenges.set(email, options.challenge);
    return options;
  },

  async authenticationVerify(email: string, response: AuthenticationResponseJSON): Promise<VerifyResult> {
    const expectedChallenge = challenges.get(email);
    const cred = credById.get(response.id);
    if (!expectedChallenge || !cred) return { verified: false };
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: expectedOrigin(),
      expectedRPID: rpID(),
      credential: { id: cred.id, publicKey: cred.publicKey as Uint8Array<ArrayBuffer>, counter: cred.counter, transports: cred.transports }
    });
    if (!verification.verified) return { verified: false };
    cred.counter = verification.authenticationInfo.newCounter;
    challenges.delete(email);
    return { verified: true, userId: cred.userId, email };
  },

  hasCredential: (email: string) => (credsByEmail.get(email) || []).length > 0
};
