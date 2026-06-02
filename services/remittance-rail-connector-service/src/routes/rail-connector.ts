import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, requireRole } from "@crownx-jewel/shared-auth/guards";
import { railConnectorService, selectRail } from "../domain/rail-connector.service";

const RAIL_TYPES = ["ach", "wire", "sepa", "bacs", "regulator_portal", "manual_check"] as const;
const PROVIDERS = ["stripe_treasury", "modulr", "currencycloud", "wise_business", "regulator_native", "manual"] as const;
const STATUSES = ["active", "degraded", "suspended", "decommissioned"] as const;

const railSchema = z.object({
  jurisdictionKey: z.string(),
  railType: z.enum(RAIL_TYPES),
  provider: z.enum(PROVIDERS),
  status: z.enum(STATUSES).default("active"),
  config: z.record(z.unknown()).default({}),
  idempotencyWindowSeconds: z.number().int().nonnegative().default(86400)
});

const submitSchema = z.object({
  obligationId: z.string(),
  upstreamRemittanceRunId: z.string().optional(),
  jurisdictionKey: z.string(),
  railType: z.enum(RAIL_TYPES).optional(),
  amountCents: z.number().int().nonnegative(),
  idempotencyKey: z.string().optional()
});

const ackSchema = z.object({
  receiptUri: z.string().optional(),
  payload: z.record(z.unknown()).optional()
});

const failSchema = z.object({
  reason: z.string().min(1),
  allowRetry: z.boolean().optional()
});

export function registerRailConnectorRoutes(app: FastifyInstance) {
  // Rail registry
  app.post("/rails", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = railSchema.parse(request.body);
    const r = await railConnectorService.createRail(input as never);
    reply.code(201).send(r);
  });
  app.put("/rails/:id/status", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: typeof STATUSES[number] };
    const r = railConnectorService.setRailStatus(id, status);
    if (!r) return reply.code(404).send({ error: "not_found" });
    return r;
  });
  app.get("/rails", async (request) => {
    const { jurisdiction } = request.query as { jurisdiction?: string };
    return railConnectorService.listRails(jurisdiction);
  });
  app.get("/rails/select", async (request, reply) => {
    const { jurisdiction, railType } = request.query as { jurisdiction: string; railType?: typeof RAIL_TYPES[number] };
    const r = selectRail(jurisdiction, railType);
    if (!r) return reply.code(404).send({ error: "no_active_rail" });
    return r;
  });
  app.get("/rails/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = railConnectorService.findRail(id);
    if (!r) return reply.code(404).send({ error: "not_found" });
    return r;
  });

  // Submissions
  app.post("/rails/submissions", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = submitSchema.parse(request.body);
    const s = await railConnectorService.submit(input);
    if (!s) return reply.code(404).send({ error: "no_rail_for_jurisdiction" });
    reply.code(201).send(s);
  });
  app.post("/rails/submissions/:id/acknowledge", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = ackSchema.parse(request.body || {});
    const s = await railConnectorService.acknowledge({ submissionId: id, ...input });
    if (!s) return reply.code(404).send({ error: "not_found" });
    return s;
  });
  app.post("/rails/submissions/:id/reconcile", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const s = await railConnectorService.reconcile(id);
    if (!s) return reply.code(404).send({ error: "not_found" });
    return s;
  });
  app.post("/rails/submissions/:id/fail", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = failSchema.parse(request.body);
    const s = await railConnectorService.fail({ submissionId: id, ...input });
    if (!s) return reply.code(404).send({ error: "not_found" });
    return s;
  });
  app.post("/rails/submissions/:id/retry", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const s = await railConnectorService.retry(id);
    if (!s) return reply.code(404).send({ error: "not_found" });
    return s;
  });
  app.get("/rails/submissions", async (request) => {
    const { status, jurisdiction } = request.query as { status?: never; jurisdiction?: string };
    return railConnectorService.listSubmissions(status, jurisdiction);
  });
  app.get("/rails/submissions/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const s = railConnectorService.findSubmission(id);
    if (!s) return reply.code(404).send({ error: "not_found" });
    return s;
  });
  app.get("/rails/submissions/:id/receipts", async (request) => {
    const { id } = request.params as { id: string };
    return railConnectorService.receiptsForSubmission(id);
  });
  app.get("/rails/pipeline-summary", async () => railConnectorService.pipelineSummary());
}
