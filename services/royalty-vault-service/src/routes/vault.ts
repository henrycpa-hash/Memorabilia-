import type { FastifyInstance } from "fastify";
import type { Scenario, FanTier, AthleteTier } from "@crownx-jewel/shared-royalty";
import { royaltyVault } from "../domain/royalty-vault.service";

export function registerRoyaltyVaultRoutes(app: FastifyInstance) {
  app.get("/royalty-vault/scenarios", async () => ({ scenarios: royaltyVault.scenarios() }));

  // the athlete's royalty vault — held + claimed + donation (connected to their account)
  app.get("/royalty-vault/athlete/:athleteId", async (request) => {
    const { athleteId } = request.params as { athleteId: string };
    return royaltyVault.athleteVault(athleteId);
  });

  // register an asset's royalty config at mint (GenesisCOA struct)
  app.post("/royalty-vault/coa", async (request, reply) => {
    const b = (request.body || {}) as { assetId?: string; originatorId?: string; athleteId?: string; scenario?: Scenario; fanTier?: FanTier; athleteTier?: AthleteTier; donationElected?: boolean };
    if (!b.assetId || !b.originatorId || !b.athleteId) return reply.code(400).send({ error: "assetId_originatorId_athleteId_required" });
    return reply.code(201).send(royaltyVault.registerCoa({ assetId: b.assetId, originatorId: b.originatorId, athleteId: b.athleteId, scenario: b.scenario, fanTier: b.fanTier, athleteTier: b.athleteTier, donationElected: b.donationElected }));
  });

  // settle a resale (the 10% split; athlete slice held/paid)
  app.post("/royalty-vault/settle", async (request, reply) => {
    const b = (request.body || {}) as { assetId?: string; salePriceCents?: number };
    if (!b.assetId || !b.salePriceCents) return reply.code(400).send({ error: "assetId_and_salePriceCents_required" });
    const r = royaltyVault.settle(b.assetId, Math.floor(b.salePriceCents));
    if ("error" in r) return reply.code(404).send(r);
    return r;
  });

  // the claim flywheel: verify → release held, future hops pay direct
  app.post("/royalty-vault/athlete/:athleteId/claim", async (request) => {
    const { athleteId } = request.params as { athleteId: string };
    const b = (request.body || {}) as { method?: string };
    return royaltyVault.verifyAndClaim(athleteId, b.method);
  });

  // subscriptions + lapse + donation
  app.post("/royalty-vault/athlete/:athleteId/subscribe", async (request, reply) => {
    const { athleteId } = request.params as { athleteId: string };
    const b = (request.body || {}) as { tier?: AthleteTier };
    if (!b.tier) return reply.code(400).send({ error: "tier_required" });
    return royaltyVault.subscribeAthlete(athleteId, b.tier);
  });
  app.post("/royalty-vault/fan/:originatorId/subscribe", async (request, reply) => {
    const { originatorId } = request.params as { originatorId: string };
    const b = (request.body || {}) as { tier?: FanTier };
    if (!b.tier) return reply.code(400).send({ error: "tier_required" });
    return royaltyVault.subscribeFan(originatorId, b.tier);
  });
  app.post("/royalty-vault/holder/:holderId/lapse", async (request) => {
    const { holderId } = request.params as { holderId: string };
    return royaltyVault.lapse(holderId);
  });
  app.post("/royalty-vault/athlete/:athleteId/donation", async (request, reply) => {
    const { athleteId } = request.params as { athleteId: string };
    const b = (request.body || {}) as { assetId?: string; elect?: boolean };
    if (!b.assetId) return reply.code(400).send({ error: "assetId_required" });
    const r = royaltyVault.electDonation(athleteId, b.assetId, b.elect !== false);
    if ("error" in r) return reply.code(409).send(r);
    return r;
  });
  app.get("/royalty-vault/athlete/:athleteId/sell-quote", async (request) => {
    const { athleteId } = request.params as { athleteId: string };
    return royaltyVault.sellStreamQuote(athleteId);
  });
}
