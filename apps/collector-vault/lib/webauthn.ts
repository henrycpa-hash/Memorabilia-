/**
 * WebAuthn / FIDO2 passkey client — real flow via @simplewebauthn/browser.
 *
 * The biometric never leaves the device; the browser's platform authenticator
 * signs the challenge and only the assertion/public key is sent. The gateway
 * proxies to `passkey-service` (@simplewebauthn/server) which verifies the
 * signature cryptographically, then the gateway mints the existing JWT session.
 * Falls back to the existing Jewel email/password flow on any failure.
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

export async function platformAuthenticatorAvailable(): Promise<boolean> {
  if (!passkeysSupported()) return false;
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
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

/** Register a platform passkey, bound to the CrownX origin. */
export async function registerPasskey(email: string, displayName: string): Promise<AuthResult> {
  const optionsJSON = await postJson<PublicKeyCredentialCreationOptionsJSON>("/api/auth/passkey/register/options", { email, displayName });
  const response = await startRegistration({ optionsJSON });
  return postJson<AuthResult>("/api/auth/passkey/register/verify", { email, response });
}

/** Authenticate an existing collector with their passkey. */
export async function loginWithPasskey(email: string): Promise<AuthResult> {
  const optionsJSON = await postJson<PublicKeyCredentialRequestOptionsJSON>("/api/auth/passkey/login/options", { email });
  const response = await startAuthentication({ optionsJSON });
  return postJson<AuthResult>("/api/auth/passkey/login/verify", { email, response });
}

/** Existing Jewel email/password flow — PRESERVED as the universal fallback. */
export async function loginWithPassword(email: string, password: string): Promise<AuthResult> {
  return postJson<AuthResult>("/api/login", { email, password });
}

export async function registerWithPassword(email: string, displayName: string, password: string): Promise<AuthResult> {
  return postJson<AuthResult>("/api/register", { email, displayName, password, role: "fan" });
}

/** Wave 2 dev session: token in a readable cookie so SSR pages can call the gateway. */
export function persistSession(token: string) {
  document.cookie = `cx_access=${token}; path=/; max-age=3600; samesite=lax`;
}
