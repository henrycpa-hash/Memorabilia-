import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, requireRole } from "@crownx-jewel/shared-auth/guards";
import { salesService } from "../domain/sales.service";

const STAGES = ["discovery", "qualification", "evaluation", "diligence", "negotiation", "executed", "closed_lost"] as const;
const ITEM_STATUSES = ["pending", "in_progress", "ready", "delivered", "blocked"] as const;
const WORKSPACE_STATUSES = ["preparing", "in_progress", "buyer_review", "completed", "abandoned"] as const;
const ITEM_CATEGORIES = ["security", "privacy", "legal", "financial", "compliance", "operations", "commercial"] as const;

const oppSchema = z.object({
  accountName: z.string().min(1),
  buyerKey: z.string().min(1),
  ownerUserId: z.string().optional(),
  estimatedDealCents: z.number().int().nonnegative().optional(),
  expectedCloseDate: z.string().optional(),
  scopeJson: z.record(z.unknown()).optional()
});

const checklistItemSchema = z.object({
  itemKey: z.string(),
  title: z.string(),
  category: z.enum(ITEM_CATEGORIES),
  defaultEvidenceRef: z.string().optional(),
  buyerSpecific: z.boolean(),
  estimatedEffortHours: z.number().nonnegative()
});

const workspaceSchema = z.object({
  opportunityId: z.string(),
  checklistOverride: z.array(checklistItemSchema).optional()
});

const itemUpdateSchema = z.object({
  status: z.enum(ITEM_STATUSES).optional(),
  body: z.string().optional(),
  evidenceRef: z.string().nullable().optional(),
  reviewerUserId: z.string().optional()
});

const reuseSchema = z.object({
  targetItemId: z.string(),
  sourceItemId: z.string()
});

export function registerSalesRoutes(app: FastifyInstance) {
  // Opportunities
  app.post("/sales/opportunities", { preHandler: requireAuth }, async (request, reply) => {
    const input = oppSchema.parse(request.body);
    const o = await salesService.createOpportunity({ ...input, ownerUserId: input.ownerUserId || request.auth!.userId });
    reply.code(201).send(o);
  });
  app.put("/sales/opportunities/:id/stage", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { stage } = request.body as { stage: typeof STAGES[number] };
    const o = salesService.setStage(id, stage);
    if (!o) return reply.code(404).send({ error: "not_found" });
    return o;
  });
  app.post("/sales/opportunities/:id/advance", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const o = salesService.advance(id);
    if (!o) return reply.code(404).send({ error: "not_found_or_terminal" });
    return o;
  });
  app.get("/sales/opportunities", async (request) => {
    const { stage } = request.query as { stage?: typeof STAGES[number] };
    return salesService.listOpportunities(stage);
  });
  app.get("/sales/opportunities/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const o = salesService.findOpportunity(id);
    if (!o) return reply.code(404).send({ error: "not_found" });
    return o;
  });

  // Workspaces
  app.post("/sales/diligence/workspaces", { preHandler: requireAuth }, async (request, reply) => {
    const input = workspaceSchema.parse(request.body);
    const w = await salesService.openWorkspace(input as never);
    if (!w) return reply.code(404).send({ error: "opportunity_not_found" });
    reply.code(201).send(w);
  });
  app.put("/sales/diligence/workspaces/:id/status", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: typeof WORKSPACE_STATUSES[number] };
    const w = salesService.setWorkspaceStatus(id, status);
    if (!w) return reply.code(404).send({ error: "not_found" });
    return w;
  });
  app.post("/sales/diligence/workspaces/:id/submit", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const w = await salesService.submitWorkspace(id);
    if (!w) return reply.code(404).send({ error: "not_found" });
    return w;
  });
  app.get("/sales/diligence/workspaces", async (request) => {
    const { opportunityId } = request.query as { opportunityId?: string };
    return salesService.listWorkspaces(opportunityId);
  });
  app.get("/sales/diligence/workspaces/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const w = salesService.findWorkspace(id);
    if (!w) return reply.code(404).send({ error: "not_found" });
    return w;
  });
  app.get("/sales/diligence/workspaces/:id/items", async (request) => {
    const { id } = request.params as { id: string };
    return salesService.itemsForWorkspace(id);
  });
  app.get("/sales/diligence/workspaces/:id/stats", async (request, reply) => {
    const { id } = request.params as { id: string };
    const s = salesService.workspaceStats(id);
    if (!s) return reply.code(404).send({ error: "not_found" });
    return s;
  });
  app.get("/sales/diligence/workspaces/:id/reuse-suggestions", async (request) => {
    const { id } = request.params as { id: string };
    return salesService.reuseSuggestions(id);
  });

  // Response items
  app.put("/sales/diligence/items/:id", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = itemUpdateSchema.parse(request.body);
    const ri = salesService.updateResponseItem({ id, ...input });
    if (!ri) return reply.code(404).send({ error: "not_found" });
    return ri;
  });
  app.post("/sales/diligence/items/reuse", { preHandler: requireAuth }, async (request, reply) => {
    const input = reuseSchema.parse(request.body);
    const ri = salesService.applyReuse(input);
    if (!ri) return reply.code(404).send({ error: "not_found" });
    return ri;
  });
}
