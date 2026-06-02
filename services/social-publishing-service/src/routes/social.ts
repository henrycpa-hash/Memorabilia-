import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, requireRole } from "@crownx-jewel/shared-auth/guards";
import { socialService } from "../domain/social.service";

const draftSchema = z.object({
  channel: z.enum(["twitter", "instagram", "tiktok", "youtube", "linkedin", "discord"]),
  text: z.string().min(1),
  mediaUrls: z.array(z.string()).optional(),
  linkUrl: z.string().optional(),
  scheduledAt: z.string().optional()
});

const scheduleSchema = z.object({ scheduledAt: z.string() });

export function registerSocialRoutes(app: FastifyInstance) {
  app.post(
    "/social/posts",
    { preHandler: requireRole("creator", "admin") },
    async (request, reply) => {
      const input = draftSchema.parse(request.body);
      const p = socialService.draft({
        creatorId: request.auth!.userId,
        ...input
      });
      reply.code(201).send(p);
    }
  );

  app.get("/social/posts", async () => socialService.list());

  app.get("/social/posts/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const p = socialService.findById(id);
    if (!p) return reply.code(404).send({ error: "not_found" });
    return p;
  });

  app.get("/social/posts/by-creator/:creatorId", async (request) => {
    const { creatorId } = request.params as { creatorId: string };
    return socialService.forCreator(creatorId);
  });

  app.post(
    "/social/posts/:id/approve",
    { preHandler: requireRole("creator", "admin") },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const p = socialService.approve(id);
      if (!p) return reply.code(404).send({ error: "not_found" });
      return p;
    }
  );

  app.post(
    "/social/posts/:id/schedule",
    { preHandler: requireRole("creator", "admin") },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = scheduleSchema.parse(request.body);
      const p = socialService.schedule(id, body.scheduledAt);
      if (!p) return reply.code(404).send({ error: "not_found" });
      return p;
    }
  );

  app.post(
    "/social/posts/:id/publish-now",
    { preHandler: requireAuth },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const p = await socialService.publishNow(id);
      if (!p) return reply.code(404).send({ error: "not_found" });
      return p;
    }
  );

  app.post("/workers/social/tick", async (_request, reply) => {
    const result = await socialService.tick();
    reply.send(result);
  });
}
