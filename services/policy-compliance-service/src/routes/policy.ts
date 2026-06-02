import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "@crownx-jewel/shared-auth/guards";
import { policyService } from "../domain/policy.service";

const ruleSchema = z.object({
  ruleKey: z.string(),
  description: z.string(),
  prohibitedTerms: z.array(z.string()).optional(),
  allowedTerritories: z.array(z.string()).optional(),
  prohibitedTerritories: z.array(z.string()).optional(),
  minAgeYears: z.number().int().nonnegative().optional(),
  maxRewardUsd: z.number().nonnegative().optional(),
  prohibitedRewardTypes: z.array(z.string()).optional(),
  prohibitedAudienceTypes: z.array(z.string()).optional(),
  rightsWindowDays: z.number().int().nonnegative().optional()
});

const createPackSchema = z.object({
  policyType: z.enum(["school", "league", "territory", "nil_general", "tenant"]),
  name: z.string().min(1),
  version: z.string().optional(),
  rules: z.array(ruleSchema).min(1),
  tenantId: z.string().optional()
});

const subjectSchema = z.object({
  subjectType: z.enum(["campaign", "social_post", "partner_listing", "collectible"]),
  subjectId: z.string(),
  text: z.string().optional(),
  audienceType: z.string().optional(),
  rewardUsd: z.number().nonnegative().optional(),
  rewardType: z.string().optional(),
  territory: z.string().optional(),
  participantAgeYears: z.number().int().nonnegative().optional(),
  rightsWindowDays: z.number().int().nonnegative().optional()
});

const evalSchema = z.object({
  policyPackId: z.string(),
  subject: subjectSchema,
  tenantId: z.string().optional()
});

const evalTypeSchema = z.object({
  policyType: z.enum(["school", "league", "territory", "nil_general", "tenant"]),
  subject: subjectSchema,
  tenantId: z.string().optional()
});

export function registerPolicyRoutes(app: FastifyInstance) {
  app.post("/policies/packs", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = createPackSchema.parse(request.body);
    const p = await policyService.createPack(input);
    reply.code(201).send(p);
  });

  app.get("/policies/packs", async () => policyService.list());
  app.get("/policies/packs/by-type/:type", async (request) => {
    const { type } = request.params as { type: string };
    return policyService.byType(type as never);
  });
  app.get("/policies/packs/by-tenant/:tenantId", async (request) => {
    const { tenantId } = request.params as { tenantId: string };
    return policyService.byTenant(tenantId);
  });
  app.get("/policies/packs/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const p = policyService.findById(id);
    if (!p) return reply.code(404).send({ error: "not_found" });
    return p;
  });
  app.post("/policies/packs/:id/archive", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const p = policyService.archivePack(id);
    if (!p) return reply.code(404).send({ error: "not_found" });
    return p;
  });

  app.post("/policies/evaluate", async (request, reply) => {
    const input = evalSchema.parse(request.body);
    const ev = await policyService.evaluate(input);
    if (!ev) return reply.code(404).send({ error: "pack_not_found" });
    reply.code(201).send(ev);
  });

  app.post("/policies/evaluate-by-type", async (request, reply) => {
    const input = evalTypeSchema.parse(request.body);
    const result = await policyService.evaluateAcrossType(input);
    reply.code(201).send(result);
  });

  app.get("/policies/evaluations", async () => policyService.listEvaluations());
  app.get("/policies/evaluations/by-subject/:subjectType/:subjectId", async (request) => {
    const { subjectType, subjectId } = request.params as { subjectType: string; subjectId: string };
    return policyService.evaluationsForSubject(subjectType, subjectId);
  });
}
