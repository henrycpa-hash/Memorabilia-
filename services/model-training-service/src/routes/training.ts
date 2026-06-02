import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, requireRole } from "@crownx-jewel/shared-auth/guards";
import { trainingService } from "../domain/training.service";

const labelSchema = z.object({
  subjectType: z.string(),
  subjectId: z.string(),
  featureSnapshotId: z.string().optional(),
  labelClass: z.enum(["fraud_confirmed", "fraud_suspected", "legitimate", "ambiguous"]),
  labelSource: z.enum(["human_review", "dispute_outcome", "manual", "import"]),
  notes: z.string().optional()
});

const datasetSchema = z.object({ name: z.string().min(1) });

const trainingSchema = z.object({
  datasetId: z.string(),
  modelName: z.string().optional(),
  candidateVersion: z.string().optional()
});

const promoteSchema = z.object({ target: z.enum(["challenger", "champion"]) });

export function registerTrainingRoutes(app: FastifyInstance) {
  // Labels
  app.post("/training/labels", { preHandler: requireAuth }, async (request, reply) => {
    const input = labelSchema.parse(request.body);
    const l = await trainingService.addLabel({
      ...input,
      labeledByUserId: request.auth!.userId
    });
    reply.code(201).send(l);
  });
  app.get("/training/labels", async () => trainingService.listLabels());
  app.get("/training/labels/mix", async () => trainingService.labelMix());

  // Datasets
  app.post("/training/datasets", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = datasetSchema.parse(request.body);
    const ds = trainingService.buildDataset(input.name);
    reply.code(201).send(ds);
  });
  app.get("/training/datasets", async () => trainingService.listDatasets());

  // Training jobs
  app.post("/training/jobs", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = trainingSchema.parse(request.body);
    const job = await trainingService.startTraining(input);
    if (!job) return reply.code(404).send({ error: "dataset_not_found" });
    reply.code(201).send(job);
  });
  app.post("/training/jobs/:id/complete", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await trainingService.completeTraining(id);
    if (!result) return reply.code(404).send({ error: "not_found" });
    return result;
  });
  app.get("/training/jobs", async () => trainingService.listJobs());
  app.get("/training/jobs/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const job = trainingService.findJob(id);
    if (!job) return reply.code(404).send({ error: "not_found" });
    return job;
  });

  // Candidates
  app.get("/training/candidates", async () => trainingService.listCandidates());
  app.get("/training/candidates/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const c = trainingService.findCandidate(id);
    if (!c) return reply.code(404).send({ error: "not_found" });
    return c;
  });
  app.post("/training/candidates/:id/promote", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = promoteSchema.parse(request.body);
    const c = trainingService.promoteCandidate(id, input.target);
    if (!c) return reply.code(404).send({ error: "not_found" });
    return c;
  });
  app.post("/training/candidates/:id/reject", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const c = trainingService.rejectCandidate(id);
    if (!c) return reply.code(404).send({ error: "not_found" });
    return c;
  });
}
