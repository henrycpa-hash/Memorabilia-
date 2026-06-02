import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "@crownx-jewel/shared-auth/guards";
import { residencyService } from "../domain/residency.service";

const REGION_KEYS = ["us_east", "us_west", "eu_west", "eu_central", "uk", "apac_singapore", "apac_tokyo", "canada", "brazil"] as const;

const regionSchema = z.object({
  regionKey: z.enum(REGION_KEYS),
  displayName: z.string().min(1),
  rules: z.object({
    allowedStorageRegions: z.array(z.enum(REGION_KEYS)),
    allowedProcessingRegions: z.array(z.enum(REGION_KEYS)),
    exportBoundaries: z.array(z.enum(REGION_KEYS)),
    crossRegionReplicationAllowed: z.boolean(),
    notes: z.string().optional()
  })
});

const assignSchema = z.object({
  tenantId: z.string(),
  regionId: z.string()
});

const evalSchema = z.object({
  tenantId: z.string(),
  subjectType: z.string(),
  subjectId: z.string(),
  action: z.enum(["store", "process", "export", "replicate"]),
  targetRegion: z.enum(REGION_KEYS),
  sourceRegion: z.enum(REGION_KEYS).optional()
});

export function registerResidencyRoutes(app: FastifyInstance) {
  app.post("/residency/regions", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = regionSchema.parse(request.body);
    const r = await residencyService.createRegion(input);
    reply.code(201).send(r);
  });
  app.post("/residency/regions/:id/archive", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = residencyService.archiveRegion(id);
    if (!r) return reply.code(404).send({ error: "not_found" });
    return r;
  });
  app.get("/residency/regions", async () => residencyService.listRegions());
  app.get("/residency/regions/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = residencyService.findRegion(id);
    if (!r) return reply.code(404).send({ error: "not_found" });
    return r;
  });

  app.post("/residency/assignments", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = assignSchema.parse(request.body);
    const a = await residencyService.assignTenant(input);
    if (!a) return reply.code(404).send({ error: "region_not_found" });
    reply.code(201).send(a);
  });
  app.get("/residency/assignments", async () => residencyService.listAssignments());
  app.get("/residency/assignments/by-tenant/:tenantId", async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    const a = residencyService.assignmentForTenant(tenantId);
    if (!a) return reply.code(404).send({ error: "no_assignment" });
    return a;
  });

  app.post("/residency/evaluate", async (request, reply) => {
    const input = evalSchema.parse(request.body);
    const r = await residencyService.evaluateAction(input);
    if (!r) return reply.code(404).send({ error: "no_residency_assignment" });
    return r;
  });
  app.get("/residency/evaluations", async (request) => {
    const { limit } = request.query as { limit?: string };
    return residencyService.listEvaluations(limit ? Number(limit) : undefined);
  });
  app.get("/residency/evaluations/denials", async () => residencyService.recentDenials());
}
