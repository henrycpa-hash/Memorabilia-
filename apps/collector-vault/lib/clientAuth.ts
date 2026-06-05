"use client";

/**
 * Client-side session + authed fetch.
 *
 * Why this exists: the gated pages used to be server components that read the
 * `cx_access` cookie via Next's `cookies()` — i.e. from the incoming request.
 * Inside a cross-site preview iframe the browser does NOT attach the cookie to
 * the document/RSC request (third-party-cookie partitioning), so SSR saw no
 * token and every gated screen rendered "you're not signed in" — the post-login
 * loop. The cookie IS readable from `document.cookie` in the iframe's own JS
 * context, so authenticating on the CLIENT (and sending the token as a Bearer
 * header) makes the session stick across every screen.
 */

const GATEWAY = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000";

export interface ClientSession {
  sub: string;
  email: string;
  token: string;
}

/** Read + decode the signed-in session from the client-readable cookie. */
export function clientSession(): ClientSession | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/cx_access=([^;]+)/);
  if (!m) return null;
  try {
    const payload = JSON.parse(atob(m[1].split(".")[1])) as { sub?: string; email?: string };
    if (!payload.sub) return null;
    return { sub: payload.sub, email: payload.email || "", token: m[1] };
  } catch {
    return null;
  }
}

/** Authenticated GET through the gateway using the client-side token. */
export async function clientAuthedGet<T>(path: string): Promise<T | null> {
  const s = clientSession();
  try {
    const res = await fetch(`${GATEWAY}${path}`, {
      headers: s ? { authorization: `Bearer ${s.token}` } : {}
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Unauthenticated GET through the gateway. */
export async function clientPublicGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${GATEWAY}${path}`);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
