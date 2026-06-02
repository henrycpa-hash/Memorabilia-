import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, requireRole } from "@crownx-jewel/shared-auth/guards";
import { collectionsService } from "../domain/collections.service";

const receivableSchema = z.object({
  tenantId: z.string(),
  statementId: z.string(),
  amountDueCents: z.number().int().nonnegative(),
  dueDate: z.string()
});

const paymentSchema = z.object({ amountCents: z.number().int().positive() });

const promiseSchema = z.object({
  promisedAmountCents: z.number().int().positive(),
  promisedDate: z.string(),
  notes: z.string().optional()
});

const writeOffSchema = z.object({
  amountCents: z.number().int().positive(),
  reason: z.string().min(1)
});

export function registerCollectionsRoutes(app: FastifyInstance) {
  app.post("/collections/receivables", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = receivableSchema.parse(request.body);
    const r = await collectionsService.createReceivable(input);
    reply.code(201).send(r);
  });
  app.post("/collections/receivables/from-statement/:statementId", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { statementId } = request.params as { statementId: string };
    const r = await collectionsService.ingestFromStatement(statementId);
    if (!r) return reply.code(404).send({ error: "statement_not_found" });
    reply.code(201).send(r);
  });
  app.get("/collections/receivables", async () => collectionsService.list());
  app.get("/collections/receivables/by-tenant/:tenantId", async (request) => {
    const { tenantId } = request.params as { tenantId: string };
    return collectionsService.byTenant(tenantId);
  });
  app.get("/collections/receivables/by-bucket/:bucket", async (request) => {
    const { bucket } = request.params as { bucket: string };
    return collectionsService.byAgingBucket(bucket as never);
  });
  app.get("/collections/receivables/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = collectionsService.findById(id);
    if (!r) return reply.code(404).send({ error: "not_found" });
    return r;
  });
  app.post("/collections/receivables/:id/payment", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = paymentSchema.parse(request.body);
    const r = await collectionsService.applyPayment({ receivableId: id, ...input });
    if (!r) return reply.code(404).send({ error: "not_found" });
    return r;
  });
  app.post("/collections/dunning/run", { preHandler: requireRole("admin") }, async () => {
    const created = await collectionsService.runDunningCadence();
    return { executed: created.length, runs: created };
  });
  app.get("/collections/dunning/runs", async (request) => {
    const { receivableId } = request.query as { receivableId?: string };
    return collectionsService.listRuns(receivableId);
  });

  app.post("/collections/receivables/:id/promise-to-pay", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = promiseSchema.parse(request.body);
    const p = await collectionsService.createPromiseToPay({ receivableId: id, ...input });
    if (!p) return reply.code(404).send({ error: "not_found" });
    reply.code(201).send(p);
  });
  app.post("/collections/promises/:id/resolve", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { kept } = request.body as { kept: boolean };
    const p = collectionsService.resolvePromise(id, !!kept);
    if (!p) return reply.code(404).send({ error: "not_found" });
    return p;
  });
  app.get("/collections/promises", async (request) => {
    const { receivableId } = request.query as { receivableId?: string };
    return collectionsService.listPromises(receivableId);
  });

  app.post("/collections/receivables/:id/writeoffs", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = writeOffSchema.parse(request.body);
    const wo = await collectionsService.createWriteOff({
      receivableId: id,
      requestedByUserId: request.auth!.userId,
      ...input
    });
    if (!wo) return reply.code(404).send({ error: "not_found" });
    reply.code(201).send(wo);
  });
  app.post("/collections/writeoffs/:id/approve", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const wo = await collectionsService.approveWriteOff({
      writeOffId: id,
      approverUserId: request.auth!.userId
    });
    if (!wo) return reply.code(404).send({ error: "not_found" });
    return wo;
  });
  app.get("/collections/writeoffs", async (request) => {
    const { status } = request.query as { status?: string };
    return collectionsService.listWriteOffs(status as never);
  });

  app.get("/collections/tenant-summary/:tenantId", async (request) => {
    const { tenantId } = request.params as { tenantId: string };
    return collectionsService.tenantSummary(tenantId);
  });
}
