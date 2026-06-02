import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, requireRole } from "@crownx-jewel/shared-auth/guards";
import { fedAnalyticsService } from "../domain/federated.service";

const groupSchema = z.object({
  peerGroupKey: z.string().min(1),
  scopeType: z.enum(["tenant", "partner", "tenant_segment", "partner_segment"]),
  description: z.string().optional(),
  memberIds: z.array(z.string()),
  rulesJson: z.record(z.unknown()).optional()
});

const benchmarkSchema = z.object({
  peerGroupId: z.string(),
  metricKeys: z.array(z.string()).min(1),
  requestingTenantId: z.string().optional()
});

export function registerFederatedRoutes(app: FastifyInstance) {
  app.post("/federated-analytics/peer-groups", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = groupSchema.parse(request.body);
    const g = await fedAnalyticsService.createPeerGroup(input);
    reply.code(201).send(g);
  });
  app.get("/federated-analytics/peer-groups", async () => fedAnalyticsService.listPeerGroups());
  app.get("/federated-analytics/peer-groups/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const g = fedAnalyticsService.findPeerGroup(id);
    if (!g) return reply.code(404).send({ error: "not_found" });
    return g;
  });

  app.post("/federated-analytics/benchmarks", { preHandler: requireAuth }, async (request, reply) => {
    const input = benchmarkSchema.parse(request.body);
    const r = await fedAnalyticsService.runBenchmark(input);
    if (!r) return reply.code(404).send({ error: "peer_group_not_found_or_unauthorized" });
    reply.code(201).send(r);
  });
  app.get("/federated-analytics/benchmarks", async () => fedAnalyticsService.listRuns());
  app.get("/federated-analytics/benchmarks/by-group/:groupId", async (request) => {
    const { groupId } = request.params as { groupId: string };
    return fedAnalyticsService.runsForGroup(groupId);
  });
  app.get("/federated-analytics/benchmarks/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = fedAnalyticsService.findRun(id);
    if (!r) return reply.code(404).send({ error: "not_found" });
    return r;
  });
}
