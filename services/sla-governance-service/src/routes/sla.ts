import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "@crownx-jewel/shared-auth/guards";
import { slaService } from "../domain/sla.service";

const profileSchema = z.object({
  tenantId: z.string().optional(),
  partnerId: z.string().optional(),
  profileName: z.string().min(1),
  targets: z.record(z.number())
});

const observationSchema = z.object({
  observation: z.record(z.number()),
  payload: z.record(z.unknown()).optional()
});

export function registerSlaRoutes(app: FastifyInstance) {
  app.post("/sla/profiles", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = profileSchema.parse(request.body);
    const p = await slaService.createProfile(input as never);
    reply.code(201).send(p);
  });
  app.get("/sla/profiles", async () => slaService.list());
  app.get("/sla/profiles/by-tenant/:tenantId", async (request) => {
    const { tenantId } = request.params as { tenantId: string };
    return slaService.byTenant(tenantId);
  });
  app.get("/sla/profiles/by-partner/:partnerId", async (request) => {
    const { partnerId } = request.params as { partnerId: string };
    return slaService.byPartner(partnerId);
  });
  app.get("/sla/profiles/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const p = slaService.findById(id);
    if (!p) return reply.code(404).send({ error: "not_found" });
    return p;
  });
  app.post("/sla/profiles/:id/suspend", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const p = slaService.suspendProfile(id);
    if (!p) return reply.code(404).send({ error: "not_found" });
    return p;
  });

  app.post("/sla/profiles/:id/observations", async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = observationSchema.parse(request.body);
    const r = await slaService.observe({ profileId: id, ...input });
    if (!r) return reply.code(404).send({ error: "not_found" });
    return r;
  });

  app.get("/sla/breaches", async (request) => {
    const { profileId } = request.query as { profileId?: string };
    return slaService.listBreaches(profileId);
  });
  app.get("/sla/breaches/open", async () => slaService.openBreaches());
  app.post("/sla/breaches/:id/resolve", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const b = await slaService.resolveBreach(id);
    if (!b) return reply.code(404).send({ error: "not_found" });
    return b;
  });
}
