import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, requireRole } from "@crownx-jewel/shared-auth/guards";
import { taxRemittanceService } from "../domain/tax-remittance.service";

const OBLIGATION_TYPES = ["vat_filing", "withholding_remit", "sales_tax_filing", "1099_remit", "annual_summary"] as const;
const OBLIGATION_STATUSES = ["open", "filing_in_progress", "ready_to_remit", "remitted", "overdue", "exception", "closed"] as const;
const RUN_STATUSES = ["queued", "submitting", "submitted", "acknowledged", "rejected", "failed", "exception"] as const;

const obligationSchema = z.object({
  jurisdictionKey: z.string(),
  obligationType: z.enum(OBLIGATION_TYPES),
  periodEnd: z.string(),
  amountDueCents: z.number().int().nonnegative(),
  deadlineDaysAfterPeriodEnd: z.number().int().nonnegative().optional(),
  periodType: z.enum(["monthly", "quarterly", "annual"]).optional(),
  payload: z.record(z.unknown()).optional()
});

const linkSchema = z.object({ filingRunId: z.string() });

const remittanceSchema = z.object({
  obligationId: z.string(),
  rail: z.enum(["manual", "ach", "wire", "sepa", "regulator_portal"]).optional(),
  amountCents: z.number().int().nonnegative().optional()
});

const failSchema = z.object({
  reason: z.string().min(1),
  nextAction: z.enum(["retry", "escalate", "manual_review"])
});

export function registerTaxRemittanceRoutes(app: FastifyInstance) {
  // Obligations
  app.post("/tax/obligations", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = obligationSchema.parse(request.body);
    const o = await taxRemittanceService.createObligation(input as never);
    reply.code(201).send(o);
  });
  app.put("/tax/obligations/:id/status", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: typeof OBLIGATION_STATUSES[number] };
    const o = taxRemittanceService.setObligationStatus(id, status);
    if (!o) return reply.code(404).send({ error: "not_found" });
    return o;
  });
  app.put("/tax/obligations/:id/link-filing", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { filingRunId } = linkSchema.parse(request.body);
    const o = taxRemittanceService.linkFilingRun(id, filingRunId);
    if (!o) return reply.code(404).send({ error: "not_found" });
    return o;
  });
  app.put("/tax/obligations/:id/ready-to-remit", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const o = taxRemittanceService.markReadyToRemit(id);
    if (!o) return reply.code(404).send({ error: "not_found" });
    return o;
  });
  app.get("/tax/obligations", async (request) => {
    const { status, jurisdiction } = request.query as { status?: typeof OBLIGATION_STATUSES[number]; jurisdiction?: string };
    if (jurisdiction) return taxRemittanceService.obligationsByJurisdiction(jurisdiction);
    return taxRemittanceService.listObligations(status);
  });
  app.get("/tax/obligations/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const o = taxRemittanceService.findObligation(id);
    if (!o) return reply.code(404).send({ error: "not_found" });
    return o;
  });
  app.get("/tax/obligations/upcoming-due", async (request) => {
    const { windowDays } = request.query as { windowDays?: string };
    return taxRemittanceService.upcomingDueObligations(windowDays ? Number(windowDays) : 14);
  });
  app.post("/tax/obligations/roll-overdue", { preHandler: requireRole("admin") }, async () =>
    taxRemittanceService.rollOverdue()
  );

  // Remittance runs
  app.post("/tax/remittances", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = remittanceSchema.parse(request.body);
    const r = await taxRemittanceService.startRemittance(input);
    if (!r) return reply.code(404).send({ error: "obligation_not_ready" });
    reply.code(201).send(r);
  });
  app.post("/tax/remittances/:id/submit", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await taxRemittanceService.submitRemittance(id);
    if (!r) return reply.code(404).send({ error: "not_found" });
    return r;
  });
  app.post("/tax/remittances/:id/acknowledge", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await taxRemittanceService.acknowledgeRemittance(id);
    if (!r) return reply.code(404).send({ error: "not_found" });
    return r;
  });
  app.post("/tax/remittances/:id/fail", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = failSchema.parse(request.body);
    const r = await taxRemittanceService.failRemittance({ id, ...input });
    if (!r) return reply.code(404).send({ error: "not_found" });
    return r;
  });
  app.get("/tax/remittances", async (request) => {
    const { status, obligationId } = request.query as { status?: typeof RUN_STATUSES[number]; obligationId?: string };
    if (obligationId) return taxRemittanceService.runsForObligation(obligationId);
    return taxRemittanceService.listRuns(status);
  });
  app.get("/tax/remittances/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = taxRemittanceService.findRun(id);
    if (!r) return reply.code(404).send({ error: "not_found" });
    return r;
  });

  // Exceptions
  app.get("/tax/remittance-exceptions", async (request) => {
    const { unresolved } = request.query as { unresolved?: string };
    return taxRemittanceService.listExceptions(unresolved === "true");
  });
  app.post("/tax/remittance-exceptions/:id/resolve", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const e = taxRemittanceService.resolveException(id);
    if (!e) return reply.code(404).send({ error: "not_found" });
    return e;
  });

  app.get("/tax/remittance-pipeline-summary", async () => taxRemittanceService.pipelineSummary());
}
