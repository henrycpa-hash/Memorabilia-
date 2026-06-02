import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "@crownx-jewel/shared-auth/guards";
import { auditService } from "../domain/audit.service";

const appendSchema = z.object({
  actorId: z.string(),
  actorRole: z.string(),
  actionType: z.string(),
  aggregateType: z.string(),
  aggregateId: z.string(),
  correlationId: z.string().optional(),
  payloadJson: z.record(z.unknown()).optional(),
  // The shared-audit append helper sends a pre-built envelope; we ignore
  // the id/createdAt fields and re-stamp them server-side.
  id: z.string().optional(),
  createdAt: z.string().optional()
});

export function registerAuditRoutes(app: FastifyInstance) {
  // Internal append endpoint (called by shared-audit's append helper).
  app.post("/audit", async (request, reply) => {
    const input = appendSchema.parse(request.body);
    const entry = await auditService.append({
      actorId: input.actorId,
      actorRole: input.actorRole,
      actionType: input.actionType,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      correlationId: input.correlationId,
      payloadJson: input.payloadJson
    });
    reply.code(201).send(entry);
  });

  // Admin queue (paginated reads come in Wave 4).
  app.get(
    "/audit",
    { preHandler: requireRole("admin") },
    async () => auditService.list()
  );

  app.get(
    "/audit/by-aggregate/:type/:id",
    async (request) => {
      const { type, id } = request.params as { type: string; id: string };
      return auditService.listByAggregate(type, id);
    }
  );

  app.get(
    "/audit/by-actor/:actorId",
    { preHandler: requireRole("admin") },
    async (request) => {
      const { actorId } = request.params as { actorId: string };
      return auditService.listByActor(actorId);
    }
  );

  app.get("/audit/count", async () => ({ count: auditService.count() }));
}
