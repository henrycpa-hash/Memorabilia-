import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "@crownx-jewel/shared-auth/guards";
import { mlService } from "../domain/ml.service";

const featureSchema = z.object({
  subjectType: z.string(),
  subjectId: z.string(),
  featureVector: z.record(z.number())
});

const modelSchema = z.object({
  modelName: z.string(),
  modelVersion: z.string(),
  modelType: z.string().default("fraud_risk"),
  status: z.enum(["champion", "challenger", "retired"]).default("challenger"),
  thresholdConfigJson: z.record(z.number()).optional()
});

const outcomeSchema = z.object({
  realizedOutcome: z.string().min(1)
});

export function registerMlRoutes(app: FastifyInstance) {
  // Feature ingestion
  app.post("/ml/features", async (request, reply) => {
    const input = featureSchema.parse(request.body);
    const f = mlService.ingestFeatures(input);
    reply.code(201).send(f);
  });
  app.get("/ml/features/latest/:subjectType/:subjectId", async (request, reply) => {
    const { subjectType, subjectId } = request.params as { subjectType: string; subjectId: string };
    const f = mlService.latestFeatures(subjectType, subjectId);
    if (!f) return reply.code(404).send({ error: "not_found" });
    return f;
  });

  // Inference
  app.post("/ml/inference", async (request, reply) => {
    const input = featureSchema.parse(request.body);
    const result = await mlService.infer(input);
    reply.code(201).send(result);
  });

  app.get("/ml/inference/logs", { preHandler: requireRole("admin") }, async () => mlService.listLogs());

  app.get("/ml/inference/logs/by-subject/:subjectType/:subjectId", async (request) => {
    const { subjectType, subjectId } = request.params as { subjectType: string; subjectId: string };
    return mlService.logsForSubject(subjectType, subjectId);
  });

  app.post("/ml/inference/logs/:id/outcome", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = outcomeSchema.parse(request.body);
    const updated = mlService.recordOutcome(id, input.realizedOutcome);
    if (!updated) return reply.code(404).send({ error: "not_found" });
    return updated;
  });

  // Model registry
  app.post("/ml/models", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = modelSchema.parse(request.body);
    const m = mlService.registerModel(input);
    reply.code(201).send(m);
  });
  app.get("/ml/models", async () => mlService.listModels());
  app.get("/ml/models/champion", async (_req, reply) => {
    const m = mlService.champion();
    if (!m) return reply.code(404).send({ error: "no_champion" });
    return m;
  });
  app.get("/ml/models/challenger", async (_req, reply) => {
    const m = mlService.challenger();
    if (!m) return reply.code(404).send({ error: "no_challenger" });
    return m;
  });
  app.post("/ml/models/:id/promote", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const m = mlService.promoteChampion(id);
    if (!m) return reply.code(404).send({ error: "not_found" });
    return m;
  });
}
