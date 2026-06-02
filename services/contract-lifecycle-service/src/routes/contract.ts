import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "@crownx-jewel/shared-auth/guards";
import { contractService } from "../domain/contract.service";

const agreementSchema = z.object({
  tenantId: z.string().optional(),
  agreementType: z.enum([
    "nil_agreement", "creator_representation", "dealer_distribution",
    "auction_house_services", "institution_platform", "sponsorship",
    "licensing", "royalty_amendment"
  ]),
  counterpartyType: z.enum([
    "creator", "institution", "tenant", "agency",
    "dealer", "auction_house", "league", "school", "sponsor"
  ]),
  counterpartyName: z.string().min(1),
  counterpartyId: z.string().optional(),
  effectiveDate: z.string(),
  expirationDate: z.string().optional(),
  termsJson: z.record(z.unknown()).optional()
});

const amendmentSchema = z.object({
  effectiveDate: z.string(),
  changesJson: z.record(z.unknown())
});

const obligationSchema = z.object({
  obligationType: z.enum([
    "compliance_report_due", "renewal_review_due", "rights_window_expiry_review",
    "royalty_schedule_review", "partner_sla_review", "sponsorship_approval_check"
  ]),
  dueDate: z.string(),
  ownerRole: z.string(),
  payloadJson: z.record(z.unknown()).optional()
});

export function registerContractRoutes(app: FastifyInstance) {
  app.post("/contracts/agreements", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = agreementSchema.parse(request.body);
    const a = await contractService.createAgreement(input as never);
    reply.code(201).send(a);
  });
  app.get("/contracts/agreements", async () => contractService.list());
  app.get("/contracts/agreements/by-tenant/:tenantId", async (request) => {
    const { tenantId } = request.params as { tenantId: string };
    return contractService.byTenant(tenantId);
  });
  app.get("/contracts/agreements/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const a = contractService.findById(id);
    if (!a) return reply.code(404).send({ error: "not_found" });
    return a;
  });

  app.post("/contracts/agreements/:id/approve", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const a = contractService.approveAgreement(id);
    if (!a) return reply.code(404).send({ error: "not_found" });
    return a;
  });
  app.post("/contracts/agreements/:id/sign", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const a = contractService.signAgreement(id);
    if (!a) return reply.code(404).send({ error: "not_found" });
    return a;
  });

  app.post("/contracts/rollup", { preHandler: requireRole("admin") }, async () => {
    const transitioned = contractService.rollupStatuses();
    return { transitioned: transitioned.length, agreements: transitioned };
  });

  app.post("/contracts/agreements/:id/amendments", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = amendmentSchema.parse(request.body);
    const am = await contractService.addAmendment({ agreementId: id, ...input });
    if (!am) return reply.code(404).send({ error: "not_found" });
    reply.code(201).send(am);
  });
  app.get("/contracts/agreements/:id/amendments", async (request) => {
    const { id } = request.params as { id: string };
    return contractService.amendmentsFor(id);
  });

  app.post("/contracts/agreements/:id/obligations", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = obligationSchema.parse(request.body);
    const o = await contractService.addObligation({ agreementId: id, ...input });
    if (!o) return reply.code(404).send({ error: "not_found" });
    reply.code(201).send(o);
  });
  app.get("/contracts/agreements/:id/obligations", async (request) => {
    const { id } = request.params as { id: string };
    return contractService.obligationsFor(id);
  });
  app.post("/contracts/obligations/:id/satisfy", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const o = contractService.satisfyObligation(id);
    if (!o) return reply.code(404).send({ error: "not_found" });
    return o;
  });
  app.get("/contracts/obligations/due-within/:days", async (request) => {
    const { days } = request.params as { days: string };
    return contractService.obligationsDueWithin(Number(days));
  });

  app.post("/contracts/resolve-governing", async (request) => {
    const body = (request.body || {}) as never;
    return contractService.resolveGoverning(body);
  });
}
