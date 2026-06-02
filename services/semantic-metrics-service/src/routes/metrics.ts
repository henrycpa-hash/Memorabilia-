import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "@crownx-jewel/shared-auth/guards";
import { metricsService } from "../domain/metrics.service";

const customSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  category: z.enum(["market", "growth", "trust", "operations", "compliance"]),
  source: z.enum(["warehouse", "settlement", "fraud", "campaign", "experiment"]),
  unit: z.enum(["count", "currency", "percent", "ratio", "duration_seconds"]),
  description: z.string(),
  dimensions: z.array(z.string()),
  tenantId: z.string().optional()
});

export function registerMetricsRoutes(app: FastifyInstance) {
  app.get("/metrics", async () => metricsService.listAll());
  app.get("/metrics/defaults", async () => metricsService.listDefaults());

  app.get("/metrics/:key", async (request, reply) => {
    const { key } = request.params as { key: string };
    const def = metricsService.findByKey(key);
    if (!def) return reply.code(404).send({ error: "not_found" });
    return def;
  });

  app.post("/metrics/custom", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = customSchema.parse(request.body);
    const m = await metricsService.registerCustom(input as never);
    reply.code(201).send(m);
  });

  app.post("/metrics/:key/evaluate", async (request) => {
    const { key } = request.params as { key: string };
    const filters = (request.body as Record<string, string>) || {};
    return metricsService.evaluate(key, filters);
  });

  app.get("/metrics/evaluate-all", async (request) => {
    const q = request.query as Record<string, string>;
    return metricsService.evaluateAll(q);
  });
}
