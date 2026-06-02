import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, requireRole } from "@crownx-jewel/shared-auth/guards";
import { sovereignService } from "../domain/sovereign.service";

const TIERS = ["commercial", "regulated_enterprise", "sovereign_dedicated", "air_gapped"] as const;
const CONTROL_TYPES = ["data_export", "code_export", "key_material_export", "personnel_access", "subprocessor_routing"] as const;

const policySchema = z.object({
  allowedRegions: z.array(z.string()),
  blockedRegions: z.array(z.string()),
  crossRegionRoutingAllowed: z.boolean(),
  promotionRequiresApproval: z.boolean(),
  keyMaterialPosture: z.enum(["hsm", "local_kms", "byok"]),
  notes: z.string().optional()
});

const classSchema = z.object({
  classKey: z.string().min(1),
  displayName: z.string().min(1),
  tier: z.enum(TIERS),
  policy: policySchema
});

const assignSchema = z.object({ tenantId: z.string(), sovereignClassId: z.string() });

const controlSchema = z.object({
  tenantId: z.string(),
  controlType: z.enum(CONTROL_TYPES),
  rules: z.object({
    blockAll: z.boolean(),
    allowedDestinations: z.array(z.string()),
    blockedDestinations: z.array(z.string()),
    reviewRequired: z.boolean()
  })
});

const evalSchema = z.object({
  tenantId: z.string(),
  controlType: z.enum(CONTROL_TYPES),
  destinationRegion: z.string()
});

const promoSchema = z.object({
  tenantId: z.string(),
  fromEnvironment: z.string(),
  toEnvironment: z.string(),
  rationale: z.string()
});

export function registerSovereignRoutes(app: FastifyInstance) {
  app.post("/sovereign/classes", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = classSchema.parse(request.body);
    const c = await sovereignService.createClass(input);
    reply.code(201).send(c);
  });
  app.get("/sovereign/classes", async () => sovereignService.listClasses());
  app.get("/sovereign/classes/by-key/:key", async (request, reply) => {
    const { key } = request.params as { key: string };
    const c = sovereignService.classByKey(key);
    if (!c) return reply.code(404).send({ error: "not_found" });
    return c;
  });
  app.get("/sovereign/classes/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const c = sovereignService.findClass(id);
    if (!c) return reply.code(404).send({ error: "not_found" });
    return c;
  });

  app.post("/sovereign/assignments", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = assignSchema.parse(request.body);
    const a = await sovereignService.assignTenant(input);
    if (!a) return reply.code(404).send({ error: "class_not_found" });
    reply.code(201).send(a);
  });
  app.get("/sovereign/assignments", async () => sovereignService.listAssignments());
  app.get("/sovereign/assignments/by-tenant/:tenantId", async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    const a = sovereignService.assignmentForTenant(tenantId);
    if (!a) return reply.code(404).send({ error: "no_assignment" });
    return a;
  });

  app.post("/sovereign/export-controls", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = controlSchema.parse(request.body);
    const c = await sovereignService.createExportControl(input as never);
    reply.code(201).send(c);
  });
  app.get("/sovereign/export-controls", async (request) => {
    const { tenantId } = request.query as { tenantId?: string };
    return sovereignService.listControls(tenantId);
  });

  app.post("/sovereign/export-controls/evaluate", async (request, reply) => {
    const input = evalSchema.parse(request.body);
    const r = await sovereignService.evaluateExport(input as never);
    return r;
  });
  app.get("/sovereign/export-controls/evaluations", async (request) => {
    const { limit } = request.query as { limit?: string };
    return sovereignService.listEvaluations(limit ? Number(limit) : undefined);
  });

  app.post("/sovereign/promotions", { preHandler: requireAuth }, async (request, reply) => {
    const input = promoSchema.parse(request.body);
    const p = await sovereignService.submitPromotion(input);
    if (!p) return reply.code(404).send({ error: "no_assignment" });
    reply.code(201).send(p);
  });
  app.post("/sovereign/promotions/:id/approve", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const p = sovereignService.approvePromotion(id, request.auth!.userId);
    if (!p) return reply.code(404).send({ error: "not_found" });
    return p;
  });
  app.post("/sovereign/promotions/:id/deny", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const p = sovereignService.denyPromotion(id, request.auth!.userId);
    if (!p) return reply.code(404).send({ error: "not_found" });
    return p;
  });
  app.get("/sovereign/promotions", async () => sovereignService.listPromotions());
  app.get("/sovereign/promotions/pending", async () => sovereignService.pendingPromotions());
}
