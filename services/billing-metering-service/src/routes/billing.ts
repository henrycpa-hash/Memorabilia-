import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "@crownx-jewel/shared-auth/guards";
import { billingService } from "../domain/billing.service";

const planSchema = z.object({
  planKey: z.string().min(1),
  displayName: z.string().min(1),
  pricingModel: z.enum(["flat", "per_seat", "per_transaction", "tiered_usage", "hybrid"]),
  baseFeeCents: z.number().int().nonnegative(),
  entitlements: z.object({
    includedUnits: z.record(z.number()),
    hardCaps: z.record(z.number()).optional(),
    features: z.array(z.string()),
    unitPriceCentsPerUnit: z.record(z.number()).optional()
  })
});

const subSchema = z.object({
  tenantId: z.string(),
  planId: z.string(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional()
});

const usageSchema = z.object({
  tenantId: z.string(),
  usageType: z.enum([
    "settlement_volume_usd", "settlements_count", "active_creators", "active_users",
    "auctions_run", "campaigns_launched", "social_posts_published",
    "policy_evaluations", "partner_inventory_synced", "ml_inferences"
  ]),
  quantity: z.number().nonnegative(),
  referenceId: z.string().optional(),
  occurredAt: z.string().optional()
});

export function registerBillingRoutes(app: FastifyInstance) {
  // Plans
  app.post("/billing/plans", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = planSchema.parse(request.body);
    const p = await billingService.createPlan(input as never);
    reply.code(201).send(p);
  });
  app.get("/billing/plans", async () => billingService.listPlans());
  app.get("/billing/plans/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const p = billingService.findPlan(id);
    if (!p) return reply.code(404).send({ error: "not_found" });
    return p;
  });
  app.get("/billing/plans/by-key/:key", async (request, reply) => {
    const { key } = request.params as { key: string };
    const p = billingService.findPlanByKey(key);
    if (!p) return reply.code(404).send({ error: "not_found" });
    return p;
  });

  // Subscriptions
  app.post("/billing/subscriptions", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = subSchema.parse(request.body);
    const s = await billingService.createSubscription(input);
    if (!s) return reply.code(404).send({ error: "plan_not_found" });
    reply.code(201).send(s);
  });
  app.get("/billing/subscriptions", async () => billingService.listSubscriptions());
  app.get("/billing/subscriptions/by-tenant/:tenantId", async (request) => {
    const { tenantId } = request.params as { tenantId: string };
    return billingService.subscriptionsForTenant(tenantId);
  });
  app.get("/billing/subscriptions/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const s = billingService.findSubscription(id);
    if (!s) return reply.code(404).send({ error: "not_found" });
    return s;
  });

  // Usage
  app.post("/billing/usage", async (request, reply) => {
    const input = usageSchema.parse(request.body);
    const r = await billingService.recordUsage(input);
    reply.code(201).send(r);
  });
  app.get("/billing/usage/by-tenant/:tenantId", async (request) => {
    const { tenantId } = request.params as { tenantId: string };
    const { from, to } = request.query as { from?: string; to?: string };
    return billingService.usageForTenant(tenantId, from, to);
  });

  // Statements
  app.post("/billing/subscriptions/:id/close", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const s = await billingService.closeStatement(id);
    if (!s) return reply.code(404).send({ error: "not_found" });
    reply.code(201).send(s);
  });
  app.get("/billing/statements", { preHandler: requireRole("admin") }, async () => billingService.listStatements());
  app.get("/billing/statements/by-tenant/:tenantId", async (request) => {
    const { tenantId } = request.params as { tenantId: string };
    return billingService.statementsForTenant(tenantId);
  });

  // Feature entitlement check
  app.get("/billing/entitlements/:tenantId/:feature", async (request) => {
    const { tenantId, feature } = request.params as { tenantId: string; feature: string };
    return { tenantId, feature, granted: billingService.hasFeature(tenantId, feature) };
  });
}
