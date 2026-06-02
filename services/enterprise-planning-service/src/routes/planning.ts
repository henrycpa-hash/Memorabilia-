import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, requireRole } from "@crownx-jewel/shared-auth/guards";
import { planningService } from "../domain/planning.service";

const TIERS = ["commercial", "regulated_enterprise", "sovereign_dedicated", "air_gapped"] as const;
const STATUSES = ["active", "paused", "expansion", "renewal", "churned"] as const;
const SCENARIO_TYPES = ["best_case", "base_case", "conservative", "worst_case"] as const;

const accountSchema = z.object({
  accountName: z.string().min(1),
  ownerUserId: z.string().optional(),
  sovereigntyTier: z.enum(TIERS).optional(),
  crmAccountRef: z.string().optional(),
  opportunityId: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

const milestoneSchema = z.object({
  milestoneKey: z.string(),
  title: z.string(),
  category: z.enum(["commercial", "compliance", "implementation", "expansion", "renewal"]),
  targetDate: z.string(),
  status: z.enum(["planned", "in_progress", "complete", "blocked"])
});

const planSchema = z.object({
  accountId: z.string(),
  periodKey: z.string(),
  milestones: z.array(milestoneSchema).optional(),
  blockers: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional()
});

const planUpdateSchema = z.object({
  milestones: z.array(milestoneSchema).optional(),
  blockers: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional()
});

const assumptionsSchema = z.object({
  baselineRevenueCents: z.number().int().nonnegative(),
  growthBps: z.number().int(),
  readinessScore: z.number().int().min(0).max(100),
  sovereigntyComplexity: z.number().int().min(0).max(100),
  closeProbabilityBps: z.number().int().min(0).max(10000),
  procurementCycleDays: z.number().int().nonnegative(),
  partnerUpliftBps: z.number().int().nonnegative().optional()
});

const scenarioSchema = z.object({
  accountId: z.string(),
  scenarioName: z.string().min(1),
  assumptions: assumptionsSchema
});

const runSchema = z.object({
  accountId: z.string(),
  periodKey: z.string(),
  scenarioModelId: z.string().optional(),
  assumptions: assumptionsSchema.optional(),
  scenarioTypes: z.array(z.enum(SCENARIO_TYPES)).optional()
});

export function registerPlanningRoutes(app: FastifyInstance) {
  // Accounts
  app.post("/planning/accounts", { preHandler: requireRole("strategist", "admin") }, async (request, reply) => {
    const input = accountSchema.parse(request.body);
    const a = await planningService.createAccount({ ...input, ownerUserId: input.ownerUserId || request.auth!.userId });
    reply.code(201).send(a);
  });
  app.put("/planning/accounts/:id/status", { preHandler: requireRole("strategist", "admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: typeof STATUSES[number] };
    const a = planningService.setAccountStatus(id, status);
    if (!a) return reply.code(404).send({ error: "not_found" });
    return a;
  });
  app.get("/planning/accounts", async (request) => {
    const { status } = request.query as { status?: typeof STATUSES[number] };
    return planningService.listAccounts(status);
  });
  app.get("/planning/accounts/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const a = planningService.findAccount(id);
    if (!a) return reply.code(404).send({ error: "not_found" });
    return a;
  });

  // Plans
  app.post("/planning/plans", { preHandler: requireRole("strategist", "admin") }, async (request, reply) => {
    const input = planSchema.parse(request.body);
    const p = await planningService.createPlan({ ...input, authorUserId: request.auth!.userId });
    if (!p) return reply.code(404).send({ error: "account_not_found" });
    reply.code(201).send(p);
  });
  app.put("/planning/plans/:id", { preHandler: requireRole("strategist", "admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = planUpdateSchema.parse(request.body);
    const p = planningService.updatePlan({ id, ...input });
    if (!p) return reply.code(404).send({ error: "not_found" });
    return p;
  });
  app.get("/planning/plans", async (request) => {
    const { accountId } = request.query as { accountId?: string };
    return planningService.listPlans(accountId);
  });
  app.get("/planning/plans/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const p = planningService.findPlan(id);
    if (!p) return reply.code(404).send({ error: "not_found" });
    return p;
  });

  // Scenarios
  app.post("/planning/scenarios", { preHandler: requireRole("strategist", "admin") }, async (request, reply) => {
    const input = scenarioSchema.parse(request.body);
    const s = await planningService.createScenario(input);
    if (!s) return reply.code(404).send({ error: "account_not_found" });
    reply.code(201).send(s);
  });
  app.get("/planning/scenarios", async (request) => {
    const { accountId } = request.query as { accountId?: string };
    return planningService.listScenarios(accountId);
  });

  // Forecasts
  app.post("/planning/forecasts", { preHandler: requireRole("strategist", "admin") }, async (request, reply) => {
    const input = runSchema.parse(request.body);
    const r = await planningService.runForecastBundle(input as never);
    if (!r) return reply.code(404).send({ error: "account_not_found" });
    reply.code(201).send(r);
  });
  app.get("/planning/forecasts", async (request) => {
    const { accountId } = request.query as { accountId?: string };
    return planningService.listRuns(accountId);
  });
  app.get("/planning/forecasts/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = planningService.findRun(id);
    if (!r) return reply.code(404).send({ error: "not_found" });
    return r;
  });

  app.get("/planning/pipeline-summary", async () => planningService.pipelineSummary());
}
