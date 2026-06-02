import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "@crownx-jewel/shared-auth/guards";
import { sandboxService } from "../domain/sandbox.service";

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

const variantSchema = z.object({
  variantKey: z.string(),
  description: z.string().optional(),
  subjectOverrides: z.record(z.unknown()).optional()
});

const simulateSchema = z.object({
  policyPackId: z.string(),
  subject: subjectSchema,
  variants: z.array(variantSchema).optional()
});

const acrossTypeSchema = z.object({
  policyType: z.string(),
  subject: subjectSchema,
  variants: z.array(variantSchema).optional()
});

export function registerSandboxRoutes(app: FastifyInstance) {
  app.post("/policy-sandbox/simulations", { preHandler: requireAuth }, async (request, reply) => {
    const input = simulateSchema.parse(request.body);
    const sim = await sandboxService.simulate({
      ...input,
      preparedByUserId: request.auth!.userId
    });
    if (!sim) return reply.code(404).send({ error: "policy_pack_not_found" });
    reply.code(201).send(sim);
  });

  app.post("/policy-sandbox/simulate-by-type", { preHandler: requireAuth }, async (request, reply) => {
    const input = acrossTypeSchema.parse(request.body);
    const result = await sandboxService.simulateAcrossType(input);
    reply.code(201).send(result);
  });

  app.get("/policy-sandbox/simulations", async () => sandboxService.list());
  app.get("/policy-sandbox/simulations/by-pack/:packId", async (request) => {
    const { packId } = request.params as { packId: string };
    return sandboxService.byPack(packId);
  });
  app.get("/policy-sandbox/simulations/by-subject/:subjectType/:subjectId", async (request) => {
    const { subjectType, subjectId } = request.params as { subjectType: string; subjectId: string };
    return sandboxService.bySubject(subjectType, subjectId);
  });
  app.get("/policy-sandbox/simulations/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const s = sandboxService.findById(id);
    if (!s) return reply.code(404).send({ error: "not_found" });
    return s;
  });
}
