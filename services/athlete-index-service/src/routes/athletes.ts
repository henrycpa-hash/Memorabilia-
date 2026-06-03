import type { FastifyInstance } from "fastify";
import type { AthleteSignals, ContractKind } from "@crownx-jewel/shared-valuation";
import { athleteService, type TimelineEvent, type OrderSide, type Appraisal } from "../domain/athlete.service";

export function registerAthleteRoutes(app: FastifyInstance) {
  // the ticker
  app.get("/athletes", async () => athleteService.list());

  // resolve by slug or id
  app.get("/athletes/:key", async (request, reply) => {
    const { key } = request.params as { key: string };
    const a = athleteService.get(key) || athleteService.bySlug(key);
    if (!a) return reply.code(404).send({ error: "not_found" });
    return athleteService.detail(a);
  });

  // ingest any data point → recompute → annotated ticker move
  app.post("/athletes/:id/signals", async (request, reply) => {
    const { id } = request.params as { id: string };
    const b = (request.body || {}) as { patch?: Partial<AthleteSignals>; event?: { tag: string; label: string; note?: string } };
    if (!b.patch) return reply.code(400).send({ error: "patch_required" });
    const r = athleteService.ingestSignal(id, b.patch, b.event);
    if (!r) return reply.code(404).send({ error: "not_found" });
    return r;
  });

  // fractionalization — buy a piece of the athlete
  app.post("/athletes/:id/fractions/buy", async (request, reply) => {
    const { id } = request.params as { id: string };
    const b = (request.body || {}) as { userId?: string; shares?: number };
    if (!b.userId || !b.shares) return reply.code(400).send({ error: "userId_and_shares_required" });
    const r = athleteService.buyFractions(id, b.userId, Math.floor(b.shares));
    if ("error" in r) return reply.code(409).send(r);
    return r;
  });

  app.post("/athletes/:id/fractions/sell", async (request, reply) => {
    const { id } = request.params as { id: string };
    const b = (request.body || {}) as { userId?: string; shares?: number };
    if (!b.userId || !b.shares) return reply.code(400).send({ error: "userId_and_shares_required" });
    const r = athleteService.sellFractions(id, b.userId, Math.floor(b.shares));
    if ("error" in r) return reply.code(409).send(r);
    return r;
  });

  app.get("/athletes/:id/holdings/:userId", async (request) => {
    const { id, userId } = request.params as { id: string; userId: string };
    return athleteService.holding(id, userId);
  });

  // ---- contracts → DCF (CrownX-verified before it enters the valuation) ----
  app.post("/athletes/:id/contracts", async (request, reply) => {
    const { id } = request.params as { id: string };
    const b = (request.body || {}) as { counterparty?: string; kind?: ContractKind; annualValueCents?: number; termYears?: number; discountRate?: number; royaltyShare?: number };
    if (!b.counterparty || !b.kind || !b.annualValueCents || !b.termYears) return reply.code(400).send({ error: "counterparty_kind_annualValueCents_termYears_required" });
    const r = athleteService.uploadContract(id, { counterparty: b.counterparty, kind: b.kind, annualValueCents: b.annualValueCents, termYears: b.termYears, discountRate: b.discountRate, royaltyShare: b.royaltyShare });
    if ("error" in r) return reply.code(404).send(r);
    return reply.code(201).send(r);
  });
  app.post("/athletes/:id/contracts/:contractId/verify", async (request, reply) => {
    const { id, contractId } = request.params as { id: string; contractId: string };
    const r = athleteService.verifyContract(id, contractId);
    if ("error" in r) return reply.code(404).send(r);
    return r;
  });
  app.get("/athletes/:id/contracts", async (request) => {
    const { id } = request.params as { id: string };
    return athleteService.listContracts(id);
  });

  // ---- career/news timeline (the full history that creates value) ----
  app.post("/athletes/:id/timeline", async (request, reply) => {
    const { id } = request.params as { id: string };
    const b = (request.body || {}) as { kind?: TimelineEvent["kind"]; title?: string; detail?: string; date?: string; signalPatch?: Partial<AthleteSignals> };
    if (!b.kind || !b.title || !b.date) return reply.code(400).send({ error: "kind_title_date_required" });
    const r = athleteService.addTimelineEvent(id, { kind: b.kind, title: b.title, detail: b.detail, date: b.date, signalPatch: b.signalPatch });
    if ("error" in r) return reply.code(404).send(r);
    return reply.code(201).send(r);
  });
  app.get("/athletes/:id/timeline", async (request) => {
    const { id } = request.params as { id: string };
    return athleteService.getTimeline(id);
  });

  // ---- sovereignty consent / redaction on the ownership chain ----
  app.post("/athletes/:id/legacy/:assetId/consent", async (request, reply) => {
    const { id, assetId } = request.params as { id: string; assetId: string };
    const b = (request.body || {}) as { userId?: string; consent?: boolean; redacted?: boolean };
    if (!b.userId) return reply.code(400).send({ error: "userId_required" });
    const r = athleteService.setConsent(id, assetId, b.userId, { consent: b.consent, redacted: b.redacted });
    if ("error" in r) return reply.code(404).send(r);
    return r;
  });

  // ---- insurance verify · appraiser · auditor/regulator audit package ----
  app.get("/athletes/:id/insurance-verify/:assetId", async (request, reply) => {
    const { id, assetId } = request.params as { id: string; assetId: string };
    const r = athleteService.insuranceVerify(id, assetId);
    if ("error" in r) return reply.code(404).send(r);
    return r;
  });
  app.post("/athletes/:id/appraisal", async (request, reply) => {
    const { id } = request.params as { id: string };
    const b = (request.body || {}) as { assetId?: string; requestedBy?: string; appraiserId?: string };
    if (!b.assetId) return reply.code(400).send({ error: "assetId_required" });
    const r = athleteService.requestAppraisal(id, b.assetId, b.requestedBy || "anon", b.appraiserId);
    if ("error" in r) return reply.code(r.error === "appraiser_not_found" ? 400 : 404).send(r);
    return r;
  });
  app.get("/athletes/:id/latest-appraisal", async (request) => {
    const { id } = request.params as { id: string };
    return athleteService.latestAppraisalFor(id);
  });
  app.get("/athletes/:id/audit-package", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = athleteService.auditPackage(id);
    if ("error" in r) return reply.code(404).send(r);
    return r;
  });

  // ---- secondary-market order matching (fans trade fractions) ----
  app.post("/athletes/:id/orders", async (request, reply) => {
    const { id } = request.params as { id: string };
    const b = (request.body || {}) as { userId?: string; side?: OrderSide; shares?: number; limitPriceCents?: number };
    if (!b.userId || !b.side || !b.shares || !b.limitPriceCents) return reply.code(400).send({ error: "userId_side_shares_limitPriceCents_required" });
    const r = athleteService.placeOrder(id, b.userId, b.side, Math.floor(b.shares), Math.floor(b.limitPriceCents));
    if ("error" in r) return reply.code(409).send(r);
    return reply.code(201).send(r);
  });
  app.get("/athletes/:id/orderbook", async (request) => {
    const { id } = request.params as { id: string };
    return athleteService.orderBook(id);
  });
  app.get("/athletes/:id/fills", async (request) => {
    const { id } = request.params as { id: string };
    return athleteService.recentFills(id);
  });
  app.get("/athletes/:id/orders/:userId", async (request) => {
    const { id, userId } = request.params as { id: string; userId: string };
    return athleteService.ordersFor(id, userId);
  });
  app.post("/athletes/:id/orders/:orderId/cancel", async (request, reply) => {
    const { orderId } = request.params as { orderId: string };
    const b = (request.body || {}) as { userId?: string };
    if (!b.userId) return reply.code(400).send({ error: "userId_required" });
    const r = athleteService.cancelOrder(orderId, b.userId);
    if ("error" in r) return reply.code(404).send(r);
    return r;
  });
  app.get("/athletes/:id/top-stakeholders", async (request) => {
    const { id } = request.params as { id: string };
    return athleteService.topStakeholders(id);
  });

  // a fan's wealth across all athlete holdings (P&L + royalty stream)
  app.get("/portfolio/:userId", async (request) => {
    const { userId } = request.params as { userId: string };
    return athleteService.portfolio(userId);
  });

  // automated market maker — manually re-quote liquidity for an athlete
  app.post("/athletes/:id/market-make", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = athleteService.marketMake(id);
    if ("error" in r) return reply.code(404).send(r);
    return r;
  });

  // ---- appraiser NETWORK (choose your appraiser) ----
  app.get("/appraisers", async (request) => {
    const { specialty } = request.query as { specialty?: string };
    return { appraisers: athleteService.listAppraisers(specialty) };
  });
  app.get("/appraisers/:appraiserId", async (request, reply) => {
    const { appraiserId } = request.params as { appraiserId: string };
    const a = athleteService.getAppraiser(appraiserId);
    if (!a) return reply.code(404).send({ error: "appraiser_not_found" });
    return a;
  });

  // ---- appraiser human-in-the-loop queue ----
  app.get("/appraisals", async (request) => {
    const { status, appraiserId } = request.query as { status?: Appraisal["status"]; appraiserId?: string };
    return athleteService.appraisalQueue(status, appraiserId);
  });
  app.get("/appraisals/:appraisalId/verify", async (request, reply) => {
    const { appraisalId } = request.params as { appraisalId: string };
    const r = athleteService.verifyAppraisalReport(appraisalId);
    if ("error" in r) return reply.code(404).send(r);
    return r;
  });
  app.post("/appraisals/:appraisalId/claim", async (request, reply) => {
    const { appraisalId } = request.params as { appraisalId: string };
    const b = (request.body || {}) as { appraiserId?: string };
    if (!b.appraiserId) return reply.code(400).send({ error: "appraiserId_required" });
    const r = athleteService.claimAppraisal(appraisalId, b.appraiserId);
    if ("error" in r) return reply.code(r.error === "assigned_to_another_appraiser" ? 403 : 404).send(r);
    return r;
  });
  app.post("/appraisals/:appraisalId/submit", async (request, reply) => {
    const { appraisalId } = request.params as { appraisalId: string };
    const b = (request.body || {}) as { appraiserId?: string; appraisedValueCents?: number; notes?: string; report?: { method?: string; comparables?: string[]; condition?: string; statement?: string } };
    if (!b.appraiserId || !b.appraisedValueCents) return reply.code(400).send({ error: "appraiserId_and_appraisedValueCents_required" });
    const r = athleteService.submitAppraisal(appraisalId, b.appraiserId, Math.floor(b.appraisedValueCents), b.notes, b.report);
    if ("error" in r) return reply.code(r.error === "assigned_to_another_appraiser" ? 403 : 404).send(r);
    return r;
  });

  // a tracked, chain-anchored resale royalty (feeds index + Legacy Circle chain)
  app.post("/athletes/:id/royalty-event", async (request, reply) => {
    const { id } = request.params as { id: string };
    const b = (request.body || {}) as { assetId?: string; fromUserId?: string; toUserId?: string; salePriceCents?: number };
    if (!b.assetId || !b.fromUserId || !b.toUserId || !b.salePriceCents) {
      return reply.code(400).send({ error: "assetId_fromUserId_toUserId_salePriceCents_required" });
    }
    const r = athleteService.royaltyEvent(id, { assetId: b.assetId, fromUserId: b.fromUserId, toUserId: b.toUserId, salePriceCents: b.salePriceCents });
    if ("error" in r) return reply.code(404).send(r);
    return r;
  });

  app.get("/athletes/:id/royalty-ledger", async (request) => {
    const { id } = request.params as { id: string };
    return athleteService.royaltyLedger(id);
  });

  // the Legacy Circle — chain of owners for an asset, and all members for an athlete
  app.get("/athletes/:id/legacy/:assetId", async (request) => {
    const { id, assetId } = request.params as { id: string; assetId: string };
    return athleteService.legacyChain(id, assetId);
  });
  app.get("/athletes/:id/legacy", async (request) => {
    const { id } = request.params as { id: string };
    return athleteService.legacyCircle(id);
  });
}
