/**
 * WebAuthn / FIDO2 passkey client for the ATHLETE onboarding funnel.
 *
 * The same secure-login procedure used across CrownX: the biometric never
 * leaves the device; the platform authenticator signs the challenge and only
 * the assertion/public key is sent. The gateway proxies to `passkey-service`
 * (@simplewebauthn/server), which verifies the signature cryptographically and
 * mints the JWT session — proving the athlete/celebrity is who they claim to be
 * BEFORE any royalty is released.
 */

import { startRegistration, startAuthentication } from "@simplewebauthn/browser";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON
} from "@simplewebauthn/browser";

const GATEWAY = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000";

export function passkeysSupported(): boolean {
  return typeof window !== "undefined" && typeof window.PublicKeyCredential !== "undefined" && !!navigator.credentials;
}

export interface AuthResult {
  accessToken: string;
  user: { email: string };
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${GATEWAY}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return (await res.json()) as T;
}

export async function registerPasskey(email: string, displayName: string): Promise<AuthResult> {
  const optionsJSON = await postJson<PublicKeyCredentialCreationOptionsJSON>("/api/auth/passkey/register/options", { email, displayName });
  const response = await startRegistration({ optionsJSON });
  return postJson<AuthResult>("/api/auth/passkey/register/verify", { email, response });
}

export async function loginWithPasskey(email: string): Promise<AuthResult> {
  const optionsJSON = await postJson<PublicKeyCredentialRequestOptionsJSON>("/api/auth/passkey/login/options", { email });
  const response = await startAuthentication({ optionsJSON });
  return postJson<AuthResult>("/api/auth/passkey/login/verify", { email, response });
}

/**
 * Verify the athlete: try an existing passkey, else enroll one on the spot
 * (first-time signers). Returns the JWT session on cryptographic success.
 */
export async function verifyAthlete(email: string, displayName: string): Promise<AuthResult> {
  try {
    return await loginWithPasskey(email);
  } catch {
    return await registerPasskey(email, displayName);
  }
}

/**
 * Persist the session cookie so both client and SSR pages read it. On HTTPS
 * (cross-site preview iframe) use SameSite=None; Secure so the cookie is sent on
 * the server-render request; on http://localhost keep Lax.
 */
export function persistSession(token: string) {
  const secure = typeof window !== "undefined" && window.location.protocol === "https:";
  const attrs = secure ? "SameSite=None; Secure" : "SameSite=Lax";
  document.cookie = `cx_access=${token}; path=/; max-age=3600; ${attrs}`;
}
