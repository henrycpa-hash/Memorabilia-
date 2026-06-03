import type { FastifyInstance } from "fastify";
import { randomBytes } from "node:crypto";
import {
  listConsumerTiers,
  availableKeepAddons,
  quoteRoyaltyBuyout,
  composePriceBreakdown,
  quoteStreamSale,
  SAMPLE_RIGHTS_MARKET,
  type ConsumerTierKey,
  type StreamSaleMode
} from "@crownx-jewel/shared-pricing";

/**
 * CrownX revamp — ADDITIVE gateway routes. None of these touch the locked
 * billing/checkout/settlement logic. They back the new surfaces:
 *   • WebAuthn / FIDO2 passkey auth      (collector-vault biometric login)
 *   • founder-slab waitlist capture       (public-story-web /welcome)
 *   • CONSUMER pricing reads               (numbers come FROM @crownx-jewel/shared-pricing)
 *
 * Passkey: real FIDO2 verification is delegated to `passkey-service`
 * (@simplewebauthn/server). The gateway proxies options/verify and mints the
 * platform's existing JWT session once the service reports `verified: true`.
 */

type Waitlist = { id: string; email: string; source: string; createdAt: string };
const waitlist: Waitlist[] = [];
const newId = (p: string) => `${p}_${randomBytes(9).toString("base64url")}`;

export function registerCrownxRoutes(app: FastifyInstance) {
  function issueSession(user: { id: string; email: string }) {
    const accessToken = app.jwt.sign({ sub: user.id, email: user.email, method: "passkey" }, { expiresIn: "1h" });
    return { accessToken, user: { email: user.email } };
  }

  // ---- aggregate readiness: ping each CrownX revamp service ----
  app.get("/api/health", async (_req, reply) => {
    const targets: Record<string, string> = {
      xp: process.env.XP_SERVICE_URL || "http://localhost:4073",
      attribution: process.env.ATTRIBUTION_SERVICE_URL || "http://localhost:4074",
      passkey: process.env.PASSKEY_SERVICE_URL || "http://localhost:4075",
      athleteIndex: process.env.ATHLETE_INDEX_SERVICE_URL || "http://localhost:4076",
      packNShip: process.env.PACK_N_SHIP_SERVICE_URL || "http://localhost:4077",
      authEngine: process.env.AUTH_ENGINE_SERVICE_URL || "http://localhost:4078",
      networkFeed: process.env.NETWORK_FEED_SERVICE_URL || "http://localhost:4079"
    };
    const checks = await Promise.all(
      Object.entries(targets).map(async ([name, base]) => {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 2500);
        try {
          const r = await fetch(`${base}/health`, { signal: ctrl.signal });
          return [name, r.ok ? "up" : "degraded"] as const;
        } catch {
          return [name, "down"] as const;
        } finally {
          clearTimeout(t);
        }
      })
    );
    const services = Object.fromEntries(checks);
    const ok = Object.values(services).every((s) => s === "up");
    reply.code(ok ? 200 : 503).send({ ok, gateway: "up", services, ts: new Date().toISOString() });
  });

  // ---- WebAuthn / FIDO2 passkey (real verification via passkey-service) ----
  const passkeyBase = () => process.env.PASSKEY_SERVICE_URL || "http://localhost:4075";
  async function pk(path: string, body: unknown): Promise<{ status: number; json: { verified?: boolean; userId?: string; email?: string; [k: string]: unknown } }> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), Number(process.env.GATEWAY_PROXY_TIMEOUT_MS || 8000));
    try {
      const res = await fetch(`${passkeyBase()}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}), signal: ctrl.signal });
      return { status: res.status, json: await res.json().catch(() => ({})) };
    } catch {
      return { status: 503, json: { error: "upstream_unavailable" } };
    } finally {
      clearTimeout(timer);
    }
  }

  app.post("/api/auth/passkey/register/options", async (request, reply) => {
    const r = await pk("/passkey/register/options", request.body);
    reply.code(r.status).send(r.json);
  });
  app.post("/api/auth/passkey/register/verify", async (request, reply) => {
    const r = await pk("/passkey/register/verify", request.body);
    if (r.status === 200 && r.json.verified && r.json.userId && r.json.email) {
      return reply.send(issueSession({ id: r.json.userId, email: r.json.email }));
    }
    reply.code(401).send({ error: "verification_failed" });
  });
  app.post("/api/auth/passkey/login/options", async (request, reply) => {
    const r = await pk("/passkey/login/options", request.body);
    reply.code(r.status).send(r.json);
  });
  app.post("/api/auth/passkey/login/verify", async (request, reply) => {
    const r = await pk("/passkey/login/verify", request.body);
    if (r.status === 200 && r.json.verified && r.json.userId && r.json.email) {
      return reply.send(issueSession({ id: r.json.userId, email: r.json.email }));
    }
    reply.code(401).send({ error: "verification_failed" });
  });

  // ---- founder-slab waitlist capture ----
  app.post("/api/public-story/waitlist", async (request, reply) => {
    const { email, source } = (request.body || {}) as { email?: string; source?: string };
    if (!email || !email.includes("@")) return reply.code(400).send({ error: "email_invalid" });
    const entry: Waitlist = { id: newId("wl"), email, source: source || "welcome-landing", createdAt: new Date().toISOString() };
    waitlist.push(entry);
    // best-effort fan-out to the existing CRM service; never blocks the capture.
    const crmBase = process.env.CRM_SERVICE_URL || "http://localhost:4022";
    fetch(`${crmBase}/leads`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, source: entry.source, tag: "founder-slab" })
    }).catch(() => undefined);
    reply.code(201).send({ id: entry.id, position: waitlist.length, total: 250, held: true });
  });

  // ---- CONSUMER pricing reads (numbers come FROM @crownx-jewel/shared-pricing) ----
  app.get("/api/pricing/tiers", async (_req, reply) => {
    reply.send({
      tiers: listConsumerTiers(),
      keepAddonsByTier: {
        free: availableKeepAddons("free"),
        premium: availableKeepAddons("premium"),
        legacy: availableKeepAddons("legacy")
      }
    });
  });

  app.post("/api/pricing/buyout-quote", async (request, reply) => {
    const body = (request.body || {}) as {
      trailing12moRoyaltyCents?: number;
      tier?: ConsumerTierKey;
      keepAddonKey?: string;
      expectedAnnualGrowth?: number;
      horizonYears?: number;
    };
    if (typeof body.trailing12moRoyaltyCents !== "number" || !body.tier) {
      return reply.code(400).send({ error: "trailing12moRoyaltyCents_and_tier_required" });
    }
    reply.send(
      quoteRoyaltyBuyout({
        trailing12moRoyaltyCents: body.trailing12moRoyaltyCents,
        tier: body.tier,
        keepAddonKey: body.keepAddonKey,
        expectedAnnualGrowth: body.expectedAnnualGrowth,
        horizonYears: body.horizonYears
      })
    );
  });

  app.post("/api/pricing/breakdown", async (request, reply) => {
    const body = (request.body || {}) as { tier?: ConsumerTierKey; keepAddonKey?: string; buyoutOfferCents?: number };
    if (!body.tier) return reply.code(400).send({ error: "tier_required" });
    reply.send(composePriceBreakdown({ tier: body.tier, keepAddonKey: body.keepAddonKey, buyoutOfferCents: body.buyoutOfferCents }));
  });

  // ---- Royalty-rights: stream-sale quote + secondary market ----
  app.post("/api/rights/stream-quote", async (request, reply) => {
    const b = (request.body || {}) as {
      floorCents?: number;
      shareBps?: number;
      resaleVelocityPerYear?: number;
      annualAppreciation?: number;
      mode?: StreamSaleMode;
    };
    if (typeof b.floorCents !== "number" || typeof b.shareBps !== "number") {
      return reply.code(400).send({ error: "floorCents_and_shareBps_required" });
    }
    reply.send(
      quoteStreamSale({
        floorCents: b.floorCents,
        shareBps: b.shareBps,
        resaleVelocityPerYear: b.resaleVelocityPerYear ?? 0.8,
        annualAppreciation: b.annualAppreciation ?? 0.15,
        mode: b.mode
      })
    );
  });

  app.get("/api/rights/market", async (_req, reply) => {
    reply.send({ listings: SAMPLE_RIGHTS_MARKET });
  });

  // ---- /LV99 XP engine (proxy to xp-service) ----
  const xpBase = () => process.env.XP_SERVICE_URL || "http://localhost:4073";
  const attrBase = () => process.env.ATTRIBUTION_SERVICE_URL || "http://localhost:4074";

  async function proxy(method: "GET" | "POST", url: string, body?: unknown) {
    // resilient: time out and degrade to 503 rather than hanging/crashing the gateway
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), Number(process.env.GATEWAY_PROXY_TIMEOUT_MS || 8000));
    try {
      const res = await fetch(url, {
        method,
        headers: method === "POST" ? { "content-type": "application/json" } : undefined,
        body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
        signal: ctrl.signal
      });
      return { status: res.status, text: await res.text(), ctype: res.headers.get("content-type") || "application/json" };
    } catch {
      return { status: 503, text: JSON.stringify({ error: "upstream_unavailable" }), ctype: "application/json" };
    } finally {
      clearTimeout(timer);
    }
  }

  app.get("/api/xp/economy", async (_req, reply) => { const r = await proxy("GET", `${xpBase()}/xp/economy`); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  app.get("/api/xp/rank/:userId", async (request, reply) => { const { userId } = request.params as { userId: string }; const r = await proxy("GET", `${xpBase()}/xp/rank/${userId}`); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  app.get("/api/xp/leaderboard", async (request, reply) => { const { limit } = request.query as { limit?: string }; const r = await proxy("GET", `${xpBase()}/xp/leaderboard${limit ? `?limit=${limit}` : ""}`); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  app.post("/api/xp/grant", async (request, reply) => { const r = await proxy("POST", `${xpBase()}/xp/grant`, request.body); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  app.post("/api/xp/streak/checkin", async (request, reply) => { const r = await proxy("POST", `${xpBase()}/xp/streak/checkin`, request.body); reply.code(r.status).header("content-type", r.ctype).send(r.text); });

  // ---- Share-card attribution funnel (proxy to attribution-service) ----
  app.post("/api/renders", async (request, reply) => { const r = await proxy("POST", `${attrBase()}/renders`, request.body); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  app.get("/api/r/:id/card.svg", async (request, reply) => { const { id } = request.params as { id: string }; const r = await proxy("GET", `${attrBase()}/renders/${id}/card.svg`); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  app.get("/api/r/:id", async (request, reply) => { const { id } = request.params as { id: string }; const q = request.query as { fp?: string }; const r = await proxy("GET", `${attrBase()}/c/${id}${q.fp ? `?fp=${encodeURIComponent(q.fp)}` : ""}`); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  app.post("/api/attribution/install", async (request, reply) => { const r = await proxy("POST", `${attrBase()}/attribution/install`, request.body); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  app.get("/api/attribution/deferred/:deviceHash", async (request, reply) => { const { deviceHash } = request.params as { deviceHash: string }; const r = await proxy("GET", `${attrBase()}/attribution/deferred/${encodeURIComponent(deviceHash)}`); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  app.post("/api/attribution/activate", async (request, reply) => { const r = await proxy("POST", `${attrBase()}/attribution/activate`, request.body); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  app.post("/api/attribution/first-mint", async (request, reply) => { const r = await proxy("POST", `${attrBase()}/attribution/first-mint`, request.body); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  app.get("/api/attribution/metrics", async (_req, reply) => { const r = await proxy("GET", `${attrBase()}/attribution/metrics`); reply.code(r.status).header("content-type", r.ctype).send(r.text); });

  // ---- Athlete Index: ticker, fractions, royalties, Legacy Circle (proxy) ----
  const athBase = () => process.env.ATHLETE_INDEX_SERVICE_URL || "http://localhost:4076";
  app.get("/api/athletes", async (_req, reply) => { const r = await proxy("GET", `${athBase()}/athletes`); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  app.get("/api/athletes/:key", async (request, reply) => { const { key } = request.params as { key: string }; const r = await proxy("GET", `${athBase()}/athletes/${encodeURIComponent(key)}`); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  app.post("/api/athletes/:id/signals", async (request, reply) => { const { id } = request.params as { id: string }; const r = await proxy("POST", `${athBase()}/athletes/${id}/signals`, request.body); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  app.post("/api/athletes/:id/fractions/buy", async (request, reply) => { const { id } = request.params as { id: string }; const r = await proxy("POST", `${athBase()}/athletes/${id}/fractions/buy`, request.body); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  app.get("/api/athletes/:id/holdings/:userId", async (request, reply) => { const { id, userId } = request.params as { id: string; userId: string }; const r = await proxy("GET", `${athBase()}/athletes/${id}/holdings/${userId}`); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  app.post("/api/athletes/:id/royalty-event", async (request, reply) => { const { id } = request.params as { id: string }; const r = await proxy("POST", `${athBase()}/athletes/${id}/royalty-event`, request.body); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  app.get("/api/athletes/:id/royalty-ledger", async (request, reply) => { const { id } = request.params as { id: string }; const r = await proxy("GET", `${athBase()}/athletes/${id}/royalty-ledger`); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  app.get("/api/athletes/:id/legacy/:assetId", async (request, reply) => { const { id, assetId } = request.params as { id: string; assetId: string }; const r = await proxy("GET", `${athBase()}/athletes/${id}/legacy/${assetId}`); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  app.get("/api/athletes/:id/legacy", async (request, reply) => { const { id } = request.params as { id: string }; const r = await proxy("GET", `${athBase()}/athletes/${id}/legacy`); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  app.post("/api/athletes/:id/fractions/sell", async (request, reply) => { const { id } = request.params as { id: string }; const r = await proxy("POST", `${athBase()}/athletes/${id}/fractions/sell`, request.body); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  // contracts → DCF (CrownX-verified before valuation)
  app.post("/api/athletes/:id/contracts", async (request, reply) => { const { id } = request.params as { id: string }; const r = await proxy("POST", `${athBase()}/athletes/${id}/contracts`, request.body); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  app.post("/api/athletes/:id/contracts/:contractId/verify", async (request, reply) => { const { id, contractId } = request.params as { id: string; contractId: string }; const r = await proxy("POST", `${athBase()}/athletes/${id}/contracts/${contractId}/verify`, request.body); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  app.get("/api/athletes/:id/contracts", async (request, reply) => { const { id } = request.params as { id: string }; const r = await proxy("GET", `${athBase()}/athletes/${id}/contracts`); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  // career/news timeline
  app.post("/api/athletes/:id/timeline", async (request, reply) => { const { id } = request.params as { id: string }; const r = await proxy("POST", `${athBase()}/athletes/${id}/timeline`, request.body); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  app.get("/api/athletes/:id/timeline", async (request, reply) => { const { id } = request.params as { id: string }; const r = await proxy("GET", `${athBase()}/athletes/${id}/timeline`); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  // sovereignty consent / insurance / appraisal / audit
  app.post("/api/athletes/:id/legacy/:assetId/consent", async (request, reply) => { const { id, assetId } = request.params as { id: string; assetId: string }; const r = await proxy("POST", `${athBase()}/athletes/${id}/legacy/${assetId}/consent`, request.body); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  app.get("/api/athletes/:id/insurance-verify/:assetId", async (request, reply) => { const { id, assetId } = request.params as { id: string; assetId: string }; const r = await proxy("GET", `${athBase()}/athletes/${id}/insurance-verify/${assetId}`); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  app.post("/api/athletes/:id/appraisal", async (request, reply) => { const { id } = request.params as { id: string }; const r = await proxy("POST", `${athBase()}/athletes/${id}/appraisal`, request.body); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  app.get("/api/athletes/:id/audit-package", async (request, reply) => { const { id } = request.params as { id: string }; const r = await proxy("GET", `${athBase()}/athletes/${id}/audit-package`); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  // secondary-market order matching + stakeholders
  app.post("/api/athletes/:id/orders", async (request, reply) => { const { id } = request.params as { id: string }; const r = await proxy("POST", `${athBase()}/athletes/${id}/orders`, request.body); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  app.get("/api/athletes/:id/orderbook", async (request, reply) => { const { id } = request.params as { id: string }; const r = await proxy("GET", `${athBase()}/athletes/${id}/orderbook`); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  app.get("/api/athletes/:id/fills", async (request, reply) => { const { id } = request.params as { id: string }; const r = await proxy("GET", `${athBase()}/athletes/${id}/fills`); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  app.get("/api/athletes/:id/orders/:userId", async (request, reply) => { const { id, userId } = request.params as { id: string; userId: string }; const r = await proxy("GET", `${athBase()}/athletes/${id}/orders/${userId}`); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  app.post("/api/athletes/:id/orders/:orderId/cancel", async (request, reply) => { const { id, orderId } = request.params as { id: string; orderId: string }; const r = await proxy("POST", `${athBase()}/athletes/${id}/orders/${orderId}/cancel`, request.body); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  app.get("/api/athletes/:id/top-stakeholders", async (request, reply) => { const { id } = request.params as { id: string }; const r = await proxy("GET", `${athBase()}/athletes/${id}/top-stakeholders`); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  app.get("/api/portfolio/:userId", async (request, reply) => { const { userId } = request.params as { userId: string }; const r = await proxy("GET", `${athBase()}/portfolio/${userId}`); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  app.post("/api/athletes/:id/market-make", async (request, reply) => { const { id } = request.params as { id: string }; const r = await proxy("POST", `${athBase()}/athletes/${id}/market-make`, request.body); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  // appraiser human-in-the-loop queue
  app.get("/api/appraisals", async (request, reply) => { const { status } = request.query as { status?: string }; const r = await proxy("GET", `${athBase()}/appraisals${status ? `?status=${status}` : ""}`); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  app.post("/api/appraisals/:appraisalId/claim", async (request, reply) => { const { appraisalId } = request.params as { appraisalId: string }; const r = await proxy("POST", `${athBase()}/appraisals/${appraisalId}/claim`, request.body); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  app.post("/api/appraisals/:appraisalId/submit", async (request, reply) => { const { appraisalId } = request.params as { appraisalId: string }; const r = await proxy("POST", `${athBase()}/appraisals/${appraisalId}/submit`, request.body); reply.code(r.status).header("content-type", r.ctype).send(r.text); });

  // ---- Pack-N-Ship escrow + COA-gated settlement (proxy) ----
  const pnsBase = () => process.env.PACK_N_SHIP_SERVICE_URL || "http://localhost:4077";
  app.get("/api/trades", async (_req, reply) => { const r = await proxy("GET", `${pnsBase()}/trades`); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  app.post("/api/trades", async (request, reply) => { const r = await proxy("POST", `${pnsBase()}/trades`, request.body); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  app.get("/api/trades/:id", async (request, reply) => { const { id } = request.params as { id: string }; const r = await proxy("GET", `${pnsBase()}/trades/${id}`); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  app.get("/api/trades/:id/track", async (request, reply) => { const { id } = request.params as { id: string }; const r = await proxy("GET", `${pnsBase()}/trades/${id}/track`); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  for (const a of ["pay", "package", "ship", "delivered", "authenticate", "investigate"]) {
    app.post(`/api/trades/:id/${a}`, async (request, reply) => { const { id } = request.params as { id: string }; const r = await proxy("POST", `${pnsBase()}/trades/${id}/${a}`, request.body); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  }
  app.post("/api/invites", async (request, reply) => { const r = await proxy("POST", `${pnsBase()}/invites`, request.body); reply.code(r.status).header("content-type", r.ctype).send(r.text); });

  // ---- Live authentication engine: SOP live-capture → authenticate → mint (proxy) ----
  const authEngBase = () => process.env.AUTH_ENGINE_SERVICE_URL || "http://localhost:4078";
  app.get("/api/auth/training-sources", async (_req, reply) => { const r = await proxy("GET", `${authEngBase()}/auth/training-sources`); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  app.post("/api/auth/session", async (request, reply) => { const r = await proxy("POST", `${authEngBase()}/auth/session`, request.body); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  app.post("/api/auth/price", async (request, reply) => { const r = await proxy("POST", `${authEngBase()}/auth/price`, request.body); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  app.post("/api/auth/mint", async (request, reply) => { const r = await proxy("POST", `${authEngBase()}/auth/mint`, request.body); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  app.get("/api/auth/coas/:userId", async (request, reply) => { const { userId } = request.params as { userId: string }; const r = await proxy("GET", `${authEngBase()}/auth/coas/${userId}`); reply.code(r.status).header("content-type", r.ctype).send(r.text); });

  // ---- Network feed: market news + viral moments + live bids + click-to-buy (proxy) ----
  const feedBase = () => process.env.NETWORK_FEED_SERVICE_URL || "http://localhost:4079";
  app.get("/api/feed", async (request, reply) => { const { limit } = request.query as { limit?: string }; const r = await proxy("GET", `${feedBase()}/feed${limit ? `?limit=${limit}` : ""}`); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  app.get("/api/feed/:id", async (request, reply) => { const { id } = request.params as { id: string }; const r = await proxy("GET", `${feedBase()}/feed/${id}`); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  for (const k of ["mint", "listing", "auction", "athlete-news", "promo"]) {
    app.post(`/api/feed/${k}`, async (request, reply) => { const r = await proxy("POST", `${feedBase()}/feed/${k}`, request.body); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  }
  for (const a of ["comment", "boost", "react", "bid", "buy", "settle-auction"]) {
    app.post(`/api/feed/:id/${a}`, async (request, reply) => { const { id } = request.params as { id: string }; const r = await proxy("POST", `${feedBase()}/feed/${id}/${a}`, request.body); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  }
}
