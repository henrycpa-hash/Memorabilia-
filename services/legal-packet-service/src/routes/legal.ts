import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, requireRole } from "@crownx-jewel/shared-auth/guards";
import { legalPacketService } from "../domain/legal.service";

const createSchema = z.object({
  packetType: z.enum([
    "procurement_packet", "dispute_packet", "claims_packet",
    "compliance_packet", "audit_packet", "partner_incident_packet"
  ]),
  subjectType: z.string(),
  subjectId: z.string()
});

export function registerLegalPacketRoutes(app: FastifyInstance) {
  app.post("/legal-packets", { preHandler: requireAuth }, async (request, reply) => {
    const input = createSchema.parse(request.body);
    const p = await legalPacketService.create({ ...input, preparedByUserId: request.auth!.userId });
    reply.code(201).send(p);
  });
  app.post("/legal-packets/:id/assemble", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const p = await legalPacketService.assemble(id);
    if (!p) return reply.code(404).send({ error: "not_found" });
    return p;
  });
  app.post("/legal-packets/:id/mark-delivered", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const p = legalPacketService.markDelivered(id);
    if (!p) return reply.code(404).send({ error: "not_found" });
    return p;
  });
  app.get("/legal-packets", async () => legalPacketService.list());
  app.get("/legal-packets/by-type/:type", async (request) => {
    const { type } = request.params as { type: string };
    return legalPacketService.byType(type as never);
  });
  app.get("/legal-packets/by-subject/:subjectType/:subjectId", async (request) => {
    const { subjectType, subjectId } = request.params as { subjectType: string; subjectId: string };
    return legalPacketService.bySubject(subjectType, subjectId);
  });
  app.get("/legal-packets/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const p = legalPacketService.findById(id);
    if (!p) return reply.code(404).send({ error: "not_found" });
    return p;
  });
}
