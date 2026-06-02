import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "@crownx-jewel/shared-auth/guards";
import { insuranceService } from "../domain/insurance.service";

const policySchema = z.object({
  shipmentId: z.string().optional(),
  assetId: z.string(),
  insuredAmount: z.number().positive(),
  description: z.string().min(1)
});

const claimSchema = z.object({
  policyId: z.string(),
  settlementId: z.string().optional(),
  claimType: z.enum([
    "shipment_lost", "shipment_damaged", "shipment_theft",
    "vault_incident", "authenticity_dispute_loss", "other"
  ]),
  description: z.string().min(1)
});

const evidenceSchema = z.object({
  kind: z.enum(["photo", "video", "document", "note"]),
  uri: z.string().min(1),
  note: z.string().optional()
});

const resolveSchema = z.object({
  status: z.enum([
    "approved_payout", "approved_replacement", "approved_refund",
    "denied", "withdrawn", "closed", "under_review"
  ]),
  note: z.string().optional()
});

export function registerInsuranceRoutes(app: FastifyInstance) {
  // Policies
  app.post("/insurance/policies", async (request, reply) => {
    const input = policySchema.parse(request.body);
    const p = await insuranceService.bindPolicy(input);
    reply.code(201).send(p);
  });
  app.get("/insurance/policies", { preHandler: requireRole("admin") }, async () => insuranceService.listPolicies());
  app.get("/insurance/policies/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const p = insuranceService.findPolicy(id);
    if (!p) return reply.code(404).send({ error: "not_found" });
    return p;
  });
  app.get("/insurance/policies/by-asset/:assetId", async (request) => {
    const { assetId } = request.params as { assetId: string };
    return insuranceService.policiesForAsset(assetId);
  });
  app.get("/insurance/policies/by-shipment/:shipmentId", async (request) => {
    const { shipmentId } = request.params as { shipmentId: string };
    return insuranceService.policiesForShipment(shipmentId);
  });

  // Claims
  app.post("/insurance/claims", async (request, reply) => {
    const input = claimSchema.parse(request.body);
    const c = await insuranceService.openClaim(input);
    if (!c) return reply.code(404).send({ error: "policy_not_found" });
    reply.code(201).send(c);
  });
  app.get("/insurance/claims", { preHandler: requireRole("admin") }, async () => insuranceService.listClaims());
  app.get("/insurance/claims/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const c = insuranceService.findClaim(id);
    if (!c) return reply.code(404).send({ error: "not_found" });
    return c;
  });
  app.get("/insurance/claims/by-settlement/:settlementId", async (request) => {
    const { settlementId } = request.params as { settlementId: string };
    return insuranceService.claimsForSettlement(settlementId);
  });

  app.post("/insurance/claims/:id/evidence", async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = evidenceSchema.parse(request.body);
    const e = await insuranceService.addEvidence({ claimId: id, ...input });
    if (!e) return reply.code(404).send({ error: "claim_not_found" });
    reply.code(201).send(e);
  });
  app.get("/insurance/claims/:id/evidence", async (request) => {
    const { id } = request.params as { id: string };
    return insuranceService.evidenceForClaim(id);
  });

  app.post("/insurance/claims/:id/resolve", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = resolveSchema.parse(request.body);
    const c = await insuranceService.resolveClaim({ claimId: id, ...input });
    if (!c) return reply.code(404).send({ error: "not_found" });
    return c;
  });
}
