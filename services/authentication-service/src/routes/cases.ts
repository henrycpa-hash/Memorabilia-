import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "@crownx-jewel/shared-auth/guards";
import { authCaseService } from "../domain/auth-case.service";

const createCaseSchema = z.object({
  assetId: z.string(),
  aiScore: z.number().min(0).max(1)
});

const approveCaseSchema = z.object({
  reviewerId: z.string(),
  decisionReason: z.string().optional()
});

export function registerCaseRoutes(app: FastifyInstance) {
  // Creators (and admins) can open auth cases against their own assets.
  app.post(
    "/cases",
    { preHandler: requireRole("creator", "admin") },
    async (request, reply) => {
      const input = createCaseSchema.parse(request.body);
      const authCase = await authCaseService.create(input);
      reply.code(201).send(authCase);
    }
  );

  // Only authenticators / admins approve.
  app.post(
    "/cases/:id/approve",
    { preHandler: requireRole("authenticator", "admin") },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = approveCaseSchema.parse(request.body);
      try {
        const authCase = await authCaseService.approve(id, body.reviewerId, body.decisionReason);
        reply.send(authCase);
      } catch (err) {
        reply.code(404).send({ error: (err as Error).message });
      }
    }
  );

  // Reviewers + admins see the queue.
  app.get(
    "/cases",
    { preHandler: requireRole("authenticator", "admin") },
    async () => authCaseService.list()
  );

  app.get("/cases/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const c = authCaseService.getById(id);
    if (!c) return reply.code(404).send({ error: "not_found" });
    return c;
  });
}
