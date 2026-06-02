import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "@crownx-jewel/shared-auth/guards";
import { notificationService } from "../domain/notification.service";

const createSchema = z.object({
  userId: z.string(),
  type: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1)
});

export function registerNotificationRoutes(app: FastifyInstance) {
  // Internal-style: anyone (gateway/services) can post notifications.
  // Wave 3 will lock this down to inter-service auth.
  app.post("/notifications", async (request, reply) => {
    const input = createSchema.parse(request.body);
    const n = await notificationService.create(input);
    reply.code(201).send(n);
  });

  // The user reading their own notifications must be authenticated.
  app.get(
    "/notifications/me",
    { preHandler: requireAuth },
    async (request) => notificationService.listForUser(request.auth!.userId)
  );

  app.post(
    "/notifications/:id/read",
    { preHandler: requireAuth },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const n = await notificationService.markRead(id);
      if (!n) return reply.code(404).send({ error: "not_found" });
      reply.send(n);
    }
  );

  // Admin-style read-all (handy for debugging in dev).
  app.get("/notifications", async () => notificationService.list());
}
