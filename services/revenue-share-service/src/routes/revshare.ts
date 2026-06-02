import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "@crownx-jewel/shared-auth/guards";
import { revShareService } from "../domain/revshare.service";

const splitNodeSchema: z.ZodTypeAny = z.lazy(() =>
  z.object({
    beneficiaryId: z.string(),
    beneficiaryRole: z.enum(["platform", "tenant", "partner", "agency", "creator", "intermediary"]),
    percentage: z.number().nonnegative().optional(),
    fixedCentsBeforeSplit: z.number().int().nonnegative().optional(),
    minimumGuaranteeCents: z.number().int().nonnegative().optional(),
    maximumCents: z.number().int().nonnegative().optional(),
    children: z.array(splitNodeSchema).optional()
  })
);

const treeSchema = z.object({
  scopeType: z.enum(["platform", "tenant", "partner_tier", "creator", "campaign"]),
  scopeId: z.string(),
  name: z.string().min(1),
  effectiveDate: z.string(),
  expirationDate: z.string().optional(),
  rules: z.object({
    rootCurrency: z.string(),
    splits: z.array(splitNodeSchema)
  })
});

const calcSchema = z.object({
  scopeType: z.enum(["platform", "tenant", "partner_tier", "creator", "campaign"]),
  scopeId: z.string(),
  referenceType: z.enum(["settlement", "payout", "campaign", "manual"]),
  referenceId: z.string(),
  totalCents: z.number().int().nonnegative()
});

const statementSchema = z.object({
  partnerId: z.string(),
  periodStart: z.string(),
  periodEnd: z.string()
});

export function registerRevShareRoutes(app: FastifyInstance) {
  app.post("/revshare/trees", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = treeSchema.parse(request.body);
    const t = await revShareService.createTree(input as never);
    reply.code(201).send(t);
  });
  app.post("/revshare/trees/:id/archive", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const t = revShareService.archiveTree(id);
    if (!t) return reply.code(404).send({ error: "not_found" });
    return t;
  });
  app.get("/revshare/trees", async () => revShareService.listTrees());
  app.get("/revshare/trees/by-scope/:scopeType/:scopeId", async (request) => {
    const { scopeType, scopeId } = request.params as { scopeType: string; scopeId: string };
    return revShareService.treesForScope(scopeType as never, scopeId);
  });
  app.get("/revshare/trees/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const t = revShareService.findTree(id);
    if (!t) return reply.code(404).send({ error: "not_found" });
    return t;
  });

  app.post("/revshare/calculate", async (request, reply) => {
    const input = calcSchema.parse(request.body);
    const c = await revShareService.calculate(input);
    if (!c) return reply.code(404).send({ error: "no_active_tree_for_scope" });
    reply.code(201).send(c);
  });
  app.get("/revshare/calculations", async (request) => {
    const { treeId } = request.query as { treeId?: string };
    return revShareService.listCalculations(treeId);
  });
  app.get("/revshare/calculations/by-reference/:type/:id", async (request) => {
    const { type, id } = request.params as { type: string; id: string };
    return revShareService.calculationsByReference(type, id);
  });
  app.get("/revshare/calculations/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const c = revShareService.findCalculation(id);
    if (!c) return reply.code(404).send({ error: "not_found" });
    return c;
  });

  app.post("/revshare/partner-statements", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = statementSchema.parse(request.body);
    const s = await revShareService.buildPartnerStatement(input);
    reply.code(201).send(s);
  });
  app.get("/revshare/partner-statements", async (request) => {
    const { partnerId } = request.query as { partnerId?: string };
    return revShareService.listStatements(partnerId);
  });
  app.get("/revshare/partner-statements/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const s = revShareService.findStatement(id);
    if (!s) return reply.code(404).send({ error: "not_found" });
    return s;
  });
}
