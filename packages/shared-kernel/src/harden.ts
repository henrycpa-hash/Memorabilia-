/**
 * Production-hardening primitives shared by every CrownX service.
 *
 *  · hardenFastify  — global error + 404 handlers so a thrown/unknown route
 *                     returns clean JSON (never a hang or an opaque 500).
 *  · safeFetch      — timeout-guarded cross-service fetch; returns null instead
 *                     of hanging/throwing when a downstream service is slow/down.
 *  · validators     — coerce + bound untrusted numeric input (reject NaN /
 *                     negative / non-finite / absurd values before they reach
 *                     the engines).
 */

/* ----------------------------- Fastify hardening ----------------------------- */

interface HardenReply {
  code(status: number): { send(body: unknown): unknown };
}
interface HardenRequest {
  url?: string;
  method?: string;
}
interface HardenableApp {
  setErrorHandler(handler: (error: { statusCode?: number; code?: string; message?: string }, request: HardenRequest, reply: HardenReply) => void): void;
  setNotFoundHandler(handler: (request: HardenRequest, reply: HardenReply) => void): void;
}

/** Register consistent JSON error + not-found handlers on a Fastify app. */
export function hardenFastify(app: HardenableApp, service: string): void {
  app.setErrorHandler((error, _request, reply) => {
    const status = typeof error.statusCode === "number" && error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 500;
    reply.code(status).send({
      error: status >= 500 ? "internal_error" : error.code || "bad_request",
      service,
      message: String(error.message || "error").slice(0, 300)
    });
  });
  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({ error: "route_not_found", service, path: request.url, method: request.method });
  });
}

/* ------------------------------- safe fetch -------------------------------- */

interface SafeFetchInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  signal?: unknown;
}
interface SafeResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}

/**
 * Timeout-guarded fetch. Resolves to the Response, or `null` on timeout/error —
 * callers MUST handle null (degrade gracefully) so one slow/down service can
 * never cascade-hang another. Default timeout 5s.
 */
export async function safeFetch(url: string, init?: SafeFetchInit, timeoutMs = 5000): Promise<SafeResponse | null> {
  const g = globalThis as unknown as { fetch?: (u: string, i?: unknown) => Promise<SafeResponse>; AbortController?: new () => { abort(): void; signal: unknown } };
  if (!g.fetch) return null;
  const ctrl = g.AbortController ? new g.AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
  try {
    return await g.fetch(url, { ...init, signal: ctrl?.signal });
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** POST JSON with a timeout; returns parsed body or null. Fire-and-forget safe. */
export async function safePostJson(url: string, body: unknown, timeoutMs = 5000): Promise<unknown> {
  const res = await safeFetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) }, timeoutMs);
  if (!res || !res.ok) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/* ------------------------------- validators -------------------------------- */

/** A finite number > 0, floored to an int — else null (reject). */
export function posInt(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

/** A finite number >= 0, floored to an int — else null. */
export function nonNegInt(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}

/** A finite number > 0 (not floored) — else null. */
export function posNum(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Clamp a (possibly bad) number into [min,max]; non-finite → min. */
export function clampNum(v: unknown, min: number, max: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/** Non-empty string under a max length — else null. */
export function reqStr(v: unknown, maxLen = 512): string | null {
  return typeof v === "string" && v.length > 0 && v.length <= maxLen ? v : null;
}
