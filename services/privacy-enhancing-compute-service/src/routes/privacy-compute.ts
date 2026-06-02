import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "@crownx-jewel/shared-auth/guards";
import { privacyComputeService } from "../domain/privacy-compute.service";

const metricSetSchema = z.object({
  metricKey: z.string(),
  cohortSize: z.number().int().nonnegative(),
  rawValue: z.number(),
  kAnonymity: z.number().int().nonnegative().optional(),
  privacyClass: z.enum(["public", "internal", "tenant_scoped", "restricted", "regulated"])
});

const jobSchema = z.object({
  jobType: z.enum(["secure_aggregate", "noisy_count", "differential_release", "federated_benchmark", "k_anon_check"]),
  metricSets: z.array(metricSetSchema).min(1),
  epsilon: z.number().positive().optional(),
  policyId: z.string().optional(),
  scopeType: z.enum(["platform", "tenant", "partner"]).optional(),
  scopeId: z.string().optional()
});

export function registerPrivacyComputeRoutes(app: FastifyInstance) {
  app.post("/privacy-compute/jobs", { preHandler: requireAuth }, async (request, reply) => {
    const input = jobSchema.parse(request.body);
    const j = await privacyComputeService.submitJob(input as never);
    reply.code(201).send(j);
  });
  app.get("/privacy-compute/jobs", async (request) => {
    const { status } = request.query as { status?: string };
    return status ? privacyComputeService.jobsByStatus(status as never) : privacyComputeService.listJobs();
  });
  app.get("/privacy-compute/jobs/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const j = privacyComputeService.findJob(id);
    if (!j) return reply.code(404).send({ error: "not_found" });
    return j;
  });
  app.get("/privacy-compute/artifacts", async (request) => {
    const { jobId } = request.query as { jobId?: string };
    return privacyComputeService.listArtifacts(jobId);
  });
}
