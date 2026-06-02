import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "@crownx-jewel/shared-auth/guards";
import { assuranceService } from "../domain/assurance.service";

const auditPairSchema = z.object({
  referenceType: z.string(),
  referenceId: z.string(),
  expectedCents: z.number().int(),
  actualCents: z.number().int(),
  expectedDate: z.string().optional(),
  actualDate: z.string().optional()
});

const auditSchema = z.object({
  auditType: z.enum(["settlement_to_ledger", "ledger_to_payout", "revshare_to_statement", "settlement_to_revshare", "tax_to_remittance"]),
  scopeType: z.enum(["platform", "tenant", "partner", "manual"]),
  scopeId: z.string().optional(),
  expected: z.array(auditPairSchema).optional(),
  actual: z.array(auditPairSchema).optional(),
  notes: z.string().optional()
});

export function registerAssuranceRoutes(app: FastifyInstance) {
  app.post("/assurance/audits", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = auditSchema.parse(request.body);
    const a = await assuranceService.runAudit(input as never);
    reply.code(201).send(a);
  });
  app.get("/assurance/audits", async () => assuranceService.listAudits());
  app.get("/assurance/audits/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const a = assuranceService.findAudit(id);
    if (!a) return reply.code(404).send({ error: "not_found" });
    return a;
  });
  app.get("/assurance/audits/:id/variances", async (request) => {
    const { id } = request.params as { id: string };
    return assuranceService.variancesForAudit(id);
  });

  app.get("/assurance/variances", async (request) => {
    const { limit, severity } = request.query as { limit?: string; severity?: string };
    return assuranceService.recentVariances(limit ? Number(limit) : 50, severity);
  });

  app.get("/assurance/pipeline-summary", async () => assuranceService.pipelineSummary());
}
