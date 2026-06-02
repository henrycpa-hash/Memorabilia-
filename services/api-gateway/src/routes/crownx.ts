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

  // ---- WebAuthn / FIDO2 passkey (real verification via passkey-service) ----
  const passkeyBase = () => process.env.PASSKEY_SERVICE_URL || "http://localhost:4075";
  async function pk(path: string, body: unknown): Promise<{ status: number; json: { verified?: boolean; userId?: string; email?: string; [k: string]: unknown } }> {
    const res = await fetch(`${passkeyBase()}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) });
    return { status: res.status, json: await res.json().catch(() => ({})) };
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
    const res = await fetch(url, {
      method,
      headers: method === "POST" ? { "content-type": "application/json" } : undefined,
      body: method === "POST" ? JSON.stringify(body ?? {}) : undefined
    });
    return { status: res.status, text: await res.text(), ctype: res.headers.get("content-type") || "application/json" };
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
  app.post("/api/attribution/activate", async (request, reply) => { const r = await proxy("POST", `${attrBase()}/attribution/activate`, request.body); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  app.post("/api/attribution/first-mint", async (request, reply) => { const r = await proxy("POST", `${attrBase()}/attribution/first-mint`, request.body); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
  app.get("/api/attribution/metrics", async (_req, reply) => { const r = await proxy("GET", `${attrBase()}/attribution/metrics`); reply.code(r.status).header("content-type", r.ctype).send(r.text); });
}
