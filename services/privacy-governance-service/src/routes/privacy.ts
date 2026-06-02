import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "@crownx-jewel/shared-auth/guards";
import { privacyService } from "../domain/privacy.service";

const ruleSchema = z.object({
  ruleKey: z.string(),
  description: z.string(),
  minCohortSize: z.number().int().nonnegative(),
  kAnonymityThreshold: z.number().int().nonnegative().optional(),
  maxPrivacyClass: z.enum(["public", "internal", "tenant_scoped", "restricted", "regulated"]),
  metricWhitelist: z.array(z.string()).optional(),
  metricBlacklist: z.array(z.string()).optional()
});

const policySchema = z.object({
  name: z.string().min(1),
  scopeType: z.enum(["platform", "tenant", "partner"]),
  scopeId: z.string().optional(),
  rules: z.array(ruleSchema).min(1)
});

const evalSchema = z.object({
  policyId: z.string().optional(),
  scopeType: z.enum(["platform", "tenant", "partner"]).optional(),
  scopeId: z.string().optional(),
  subject: z.object({
    metricKey: z.string(),
    cohortSize: z.number().int().nonnegative(),
    kAnonymity: z.number().int().nonnegative().optional(),
    privacyClass: z.enum(["public", "internal", "tenant_scoped", "restricted", "regulated"]),
    requestingTenantId: z.string().optional(),
    residencyRegion: z.string().optional()
  })
});

export function registerPrivacyRoutes(app: FastifyInstance) {
  app.post("/privacy/policies", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = policySchema.parse(request.body);
    const p = await privacyService.createPolicy(input as never);
    reply.code(201).send(p);
  });
  app.post("/privacy/policies/:id/archive", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const p = privacyService.archivePolicy(id);
    if (!p) return reply.code(404).send({ error: "not_found" });
    return p;
  });
  app.get("/privacy/policies", async () => privacyService.list());
  app.get("/privacy/policies/by-scope/:scopeType", async (request) => {
    const { scopeType } = request.params as { scopeType: string };
    const { scopeId } = request.query as { scopeId?: string };
    return privacyService.byScope(scopeType, scopeId);
  });
  app.get("/privacy/policies/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const p = privacyService.findById(id);
    if (!p) return reply.code(404).send({ error: "not_found" });
    return p;
  });

  app.post("/privacy/release-checks", async (request, reply) => {
    const input = evalSchema.parse(request.body);
    const c = await privacyService.evaluate(input as never);
    if (!c) return reply.code(404).send({ error: "no_active_policy" });
    reply.code(201).send(c);
  });
  app.get("/privacy/release-checks", async (request) => {
    const { limit } = request.query as { limit?: string };
    return privacyService.listChecks(limit ? Number(limit) : undefined);
  });
  app.get("/privacy/release-checks/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const c = privacyService.findCheck(id);
    if (!c) return reply.code(404).send({ error: "not_found" });
    return c;
  });
}
