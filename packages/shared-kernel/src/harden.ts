/**
 * Production-hardening + security primitives shared by every CrownX service.
 *
 *  · hardenFastify  — global error + 404 handlers (no internal-detail leakage on
 *                     5xx) AND security response headers on every request.
 *  · rateLimit      — in-memory per-IP token bucket to throttle abuse/brute-force.
 *  · corsOrigin     — strict origin allow-list builder (env-driven).
 *  · safeFetch      — timeout-guarded cross-service fetch.
 *  · validators     — coerce + bound untrusted numeric input.
 */

/* ----------------------------- Fastify hardening ----------------------------- */

interface HardenReply {
  code(status: number): { send(body: unknown): unknown };
  header(name: string, value: string): unknown;
}
interface HardenRequest {
  url?: string;
  method?: string;
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
}
interface HardenableApp {
  setErrorHandler(handler: (error: { statusCode?: number; code?: string; message?: string }, request: HardenRequest, reply: HardenReply) => void): void;
  setNotFoundHandler(handler: (request: HardenRequest, reply: HardenReply) => void): void;
  // loose to accept Fastify's overloaded addHook; handlers below are typed inline
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addHook(name: string, handler: (...args: any[]) => unknown): unknown;
}

/** Security response headers applied to every response (defence-in-depth). */
function applySecurityHeaders(reply: HardenReply): void {
  const h = (k: string, v: string) => { try { reply.header(k, v); } catch { /* header already sent */ } };
  h("X-Content-Type-Options", "nosniff");
  h("X-Frame-Options", "DENY");
  h("Referrer-Policy", "no-referrer");
  h("X-DNS-Prefetch-Control", "off");
  h("X-Permitted-Cross-Domain-Policies", "none");
  h("Cross-Origin-Resource-Policy", "same-site");
  h("Cross-Origin-Opener-Policy", "same-origin");
  h("Permissions-Policy", "geolocation=(self), camera=(self), microphone=(self), payment=(self), usb=()");
  h("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  // JSON APIs serve no markup — a deny-everything CSP is safe and blocks injection
  h("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
  h("X-CrownX-Hardened", "1");
  h("X-Powered-By", ""); // strip server fingerprint
}

/**
 * Register consistent JSON error + 404 handlers AND security headers. The error
 * handler NEVER echoes an internal exception message on a 5xx (no stack/detail
 * leakage); client (4xx) errors keep their message for usability.
 */
export function hardenFastify(app: HardenableApp, service: string): void {
  app.setErrorHandler((error, _request, reply) => {
    const status = typeof error.statusCode === "number" && error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 500;
    const body: Record<string, unknown> = { error: status >= 500 ? "internal_error" : error.code || "bad_request", service };
    if (status < 500) body.message = String(error.message || "error").slice(0, 300);
    reply.code(status).send(body);
  });
  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({ error: "route_not_found", service, path: request.url, method: request.method });
  });
  app.addHook("onRequest", (_request, reply, done) => { applySecurityHeaders(reply); done(); });
}

/* ------------------------------- rate limiting ------------------------------- */

interface RateLimitApp {
  // loose to accept Fastify's overloaded addHook; handlers below are typed inline
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addHook(name: string, handler: (...args: any[]) => unknown): unknown;
}

/**
 * In-memory per-IP token bucket. Throttles abuse/brute-force at the edge.
 * Generous default (configurable via RATE_LIMIT_MAX / RATE_LIMIT_WINDOW_MS).
 * /health is never limited so orchestrators keep probing.
 */
export function rateLimit(app: RateLimitApp, opts?: { windowMs?: number; max?: number }): void {
  const windowMs = opts?.windowMs ?? Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
  const max = opts?.max ?? Number(process.env.RATE_LIMIT_MAX || 600);
  const buckets = new Map<string, { count: number; resetAt: number }>();
  app.addHook("onRequest", (request, reply, done) => {
    if ((request.url || "").startsWith("/health")) return done();
    const ip = request.ip || (request.headers?.["x-forwarded-for"] as string) || "unknown";
    const nowMs = Date.now();
    let b = buckets.get(ip);
    if (!b || nowMs > b.resetAt) { b = { count: 0, resetAt: nowMs + windowMs }; buckets.set(ip, b); }
    b.count += 1;
    const remaining = Math.max(0, max - b.count);
    reply.header("X-RateLimit-Limit", String(max));
    reply.header("X-RateLimit-Remaining", String(remaining));
    if (b.count > max) {
      reply.header("Retry-After", String(Math.ceil((b.resetAt - nowMs) / 1000)));
      reply.code(429).send({ error: "rate_limited", retryAfterMs: b.resetAt - nowMs });
      return; // short-circuit
    }
    // opportunistic cleanup to bound memory
    if (buckets.size > 5000) for (const [k, v] of buckets) if (nowMs > v.resetAt) buckets.delete(k);
    done();
  });
}

/**
 * Build a CORS `origin` option. With CROWNX_CORS_ORIGINS set (comma-separated)
 * it enforces a strict allow-list (plus same-origin/no-origin server calls);
 * unset, it reflects the request origin (dev/preview-friendly). Credentials are
 * never enabled — the API authenticates with Bearer tokens, not cookies.
 */
export function corsOrigin(): true | ((origin: string | undefined, cb: (err: Error | null, allow: boolean) => void) => void) {
  const raw = (process.env.CROWNX_CORS_ORIGINS || "").trim();
  if (!raw) return true;
  const allow = new Set(raw.split(",").map((s) => s.trim()).filter(Boolean));
  return (origin, cb) => cb(null, !origin || allow.has(origin));
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
