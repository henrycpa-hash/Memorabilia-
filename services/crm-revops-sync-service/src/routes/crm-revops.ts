import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "@crownx-jewel/shared-auth/guards";
import { crmRevopsService } from "../domain/crm-revops.service";

const PROVIDERS = ["salesforce", "hubspot", "dynamics", "manual_csv"] as const;
const STATUSES = ["synced", "pending", "stale", "error"] as const;

const accountSchema = z.object({
  externalAccountId: z.string().min(1),
  internalAccountId: z.string().optional(),
  provider: z.enum(PROVIDERS),
  payload: z.object({
    name: z.string(),
    owner: z.string(),
    segment: z.string(),
    industry: z.string().optional(),
    annualRevenueCents: z.number().int().nonnegative().optional()
  })
});

const opportunitySchema = z.object({
  externalOpportunityId: z.string().min(1),
  externalAccountId: z.string().min(1),
  internalOpportunityId: z.string().optional(),
  provider: z.enum(PROVIDERS),
  externalStage: z.string(),
  probabilityBps: z.number().int().min(0).max(10000).optional(),
  estimatedCloseDate: z.string().optional(),
  amountCents: z.number().int().nonnegative(),
  ownerUserId: z.string().optional()
});

const reconcileSchema = z.object({
  accountId: z.string(),
  periodKey: z.string(),
  externalAccountId: z.string()
});

const staleSchema = z.object({ maxAgeSeconds: z.number().int().nonnegative() });

export function registerCrmRevopsRoutes(app: FastifyInstance) {
  // Accounts
  app.post("/crm-revops/accounts", { preHandler: requireRole("strategist", "admin") }, async (request, reply) => {
    const input = accountSchema.parse(request.body);
    const a = await crmRevopsService.syncAccount(input as never);
    reply.code(201).send(a);
  });
  app.get("/crm-revops/accounts", async (request) => {
    const { provider, status } = request.query as { provider?: typeof PROVIDERS[number]; status?: typeof STATUSES[number] };
    return crmRevopsService.listAccounts(provider, status);
  });

  // Opportunities
  app.post("/crm-revops/opportunities", { preHandler: requireRole("strategist", "admin") }, async (request, reply) => {
    const input = opportunitySchema.parse(request.body);
    const o = await crmRevopsService.syncOpportunity(input as never);
    reply.code(201).send(o);
  });
  app.get("/crm-revops/opportunities", async (request) => {
    const { provider, externalAccountId } = request.query as { provider?: typeof PROVIDERS[number]; externalAccountId?: string };
    return crmRevopsService.listOpportunities(provider, externalAccountId);
  });

  // Reconciliation
  app.post("/crm-revops/reconciliations", { preHandler: requireRole("strategist", "admin") }, async (request, reply) => {
    const input = reconcileSchema.parse(request.body);
    const r = await crmRevopsService.reconcile(input);
    reply.code(201).send(r);
  });
  app.get("/crm-revops/reconciliations", async (request) => {
    const { accountId } = request.query as { accountId?: string };
    return crmRevopsService.listReconciliations(accountId);
  });

  app.post("/crm-revops/mark-stale", { preHandler: requireRole("admin") }, async (request) => {
    const { maxAgeSeconds } = staleSchema.parse(request.body);
    return crmRevopsService.markStale(maxAgeSeconds);
  });

  app.get("/crm-revops/pipeline-summary", async () => crmRevopsService.pipelineSummary());
}
