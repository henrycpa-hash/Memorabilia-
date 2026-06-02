import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "@crownx-jewel/shared-auth/guards";
import { connectorService } from "../domain/connector.service";

const registerSchema = z.object({
  kind: z.enum([
    "carrier", "insurance", "payment_processor", "payroll",
    "banking", "erp_gl", "document_signing", "tax_filing"
  ]),
  providerKey: z.string().min(1),
  displayName: z.string().min(1),
  tenantId: z.string().optional(),
  configJson: z.record(z.unknown()).optional(),
  retryPolicy: z.object({
    maxAttempts: z.number().int().positive(),
    initialBackoffMs: z.number().int().positive(),
    multiplier: z.number().positive()
  }).optional()
});

const invokeSchema = z.object({
  operation: z.string().min(1),
  payload: z.record(z.unknown()).optional(),
  forceFailure: z.boolean().optional()
});

export function registerConnectorRoutes(app: FastifyInstance) {
  app.post("/connectors", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = registerSchema.parse(request.body);
    const c = await connectorService.register(input);
    reply.code(201).send(c);
  });

  app.get("/connectors", async () => connectorService.list());
  app.get("/connectors/by-kind/:kind", async (request) => {
    const { kind } = request.params as { kind: string };
    return connectorService.byKind(kind as never);
  });
  app.get("/connectors/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const c = connectorService.findById(id);
    if (!c) return reply.code(404).send({ error: "not_found" });
    return c;
  });

  app.post("/connectors/:id/disable", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const c = connectorService.disable(id);
    if (!c) return reply.code(404).send({ error: "not_found" });
    return c;
  });

  app.post("/connectors/:id/invoke", async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = invokeSchema.parse(request.body);
    const result = await connectorService.invoke({ connectorId: id, ...input });
    if (!result) return reply.code(404).send({ error: "not_found" });
    return result;
  });

  app.post("/connectors/:id/reset-circuit", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const h = connectorService.resetCircuit(id);
    return h;
  });

  app.get("/connectors/:id/health", async (request, reply) => {
    const { id } = request.params as { id: string };
    const h = connectorService.health(id);
    if (!h) return reply.code(404).send({ error: "not_found" });
    return h;
  });

  app.get("/connectors/health", async () => connectorService.allHealth());

  app.get("/connectors/:id/calls", async (request) => {
    const { id } = request.params as { id: string };
    return connectorService.callsFor(id);
  });
}
