import type { FastifyInstance } from "fastify";
import type { AthleteSignals, ContractKind } from "@crownx-jewel/shared-valuation";
import { athleteService, type TimelineEvent } from "../domain/athlete.service";

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
    const b = (request.body || {}) as { assetId?: string; requestedBy?: string };
    if (!b.assetId) return reply.code(400).send({ error: "assetId_required" });
    const r = athleteService.requestAppraisal(id, b.assetId, b.requestedBy || "anon");
    if ("error" in r) return reply.code(404).send(r);
    return r;
  });
  app.get("/athletes/:id/audit-package", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = athleteService.auditPackage(id);
    if ("error" in r) return reply.code(404).send(r);
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
