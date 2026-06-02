import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "@crownx-jewel/shared-auth/guards";
import { incidentOrchService } from "../domain/incident-orch.service";

const SOVEREIGNTY_CLASSES = ["commercial", "regulated_enterprise", "sovereign_dedicated", "air_gapped"] as const;
const INCIDENT_TYPES = [
  "data_breach", "service_outage", "regulator_inquiry", "key_compromise",
  "residency_violation", "subprocessor_failure", "fraud_detected", "compliance_breach"
] as const;
const SEVERITIES = ["low", "medium", "high", "critical"] as const;
const STATUSES = ["triaging", "active", "contained", "remediating", "resolved", "closed"] as const;

const openSchema = z.object({
  tenantId: z.string(),
  sovereigntyClassKey: z.enum(SOVEREIGNTY_CLASSES),
  incidentType: z.enum(INCIDENT_TYPES),
  title: z.string().min(1),
  baseSeverity: z.enum(SEVERITIES),
  affectedRegions: z.array(z.string()).optional(),
  involvesRegulatedData: z.boolean().optional(),
  payload: z.record(z.unknown()).optional()
});

const postmortemSchema = z.object({
  postmortem: z.object({
    timeline: z.array(z.object({ at: z.string(), event: z.string() })),
    rootCause: z.string(),
    impact: z.string(),
    remediation: z.array(z.string()),
    followUps: z.array(z.string())
  }),
  outputUri: z.string().optional()
});

export function registerIncidentOrchRoutes(app: FastifyInstance) {
  app.post("/sovereignty-incidents", { preHandler: requireRole("compliance_officer", "admin") }, async (request, reply) => {
    const input = openSchema.parse(request.body);
    const i = await incidentOrchService.open(input as never);
    reply.code(201).send(i);
  });
  app.put("/sovereignty-incidents/:id/status", { preHandler: requireRole("compliance_officer", "admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: typeof STATUSES[number] };
    const i = incidentOrchService.setStatus(id, status);
    if (!i) return reply.code(404).send({ error: "not_found" });
    return i;
  });
  app.post("/sovereignty-incidents/:id/contain", { preHandler: requireRole("compliance_officer", "admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const i = incidentOrchService.contain(id);
    if (!i) return reply.code(404).send({ error: "not_found" });
    return i;
  });
  app.post("/sovereignty-incidents/:id/remediate", { preHandler: requireRole("compliance_officer", "admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const i = incidentOrchService.remediate(id);
    if (!i) return reply.code(404).send({ error: "not_found" });
    return i;
  });
  app.post("/sovereignty-incidents/:id/resolve", { preHandler: requireRole("compliance_officer", "admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = postmortemSchema.parse(request.body);
    const r = await incidentOrchService.resolve({ incidentId: id, ...input });
    if (!r) return reply.code(404).send({ error: "not_found" });
    return r;
  });
  app.post("/sovereignty-incidents/:id/close", { preHandler: requireRole("compliance_officer", "admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const i = incidentOrchService.close(id);
    if (!i) return reply.code(404).send({ error: "not_found" });
    return i;
  });

  // Runbook actions
  app.post("/sovereignty-incidents/actions/:actionId/run", { preHandler: requireRole("compliance_officer", "admin") }, async (request, reply) => {
    const { actionId } = request.params as { actionId: string };
    const a = await incidentOrchService.runAction(actionId);
    if (!a) return reply.code(404).send({ error: "not_found" });
    return a;
  });
  app.post("/sovereignty-incidents/:id/run-all-actions", { preHandler: requireRole("compliance_officer", "admin") }, async (request) => {
    const { id } = request.params as { id: string };
    return incidentOrchService.runAllActions(id);
  });
  app.get("/sovereignty-incidents/:id/actions", async (request) => {
    const { id } = request.params as { id: string };
    return incidentOrchService.actionsForIncident(id);
  });
  app.get("/sovereignty-incidents/:id/postmortem", async (request, reply) => {
    const { id } = request.params as { id: string };
    const pm = incidentOrchService.postmortemForIncident(id);
    if (!pm) return reply.code(404).send({ error: "not_found" });
    return pm;
  });

  // Reads
  app.get("/sovereignty-incidents", async (request) => {
    const { status, sovereigntyClassKey } = request.query as {
      status?: typeof STATUSES[number];
      sovereigntyClassKey?: typeof SOVEREIGNTY_CLASSES[number];
    };
    return incidentOrchService.list(status, sovereigntyClassKey);
  });
  app.get("/sovereignty-incidents/pipeline-summary", async () => incidentOrchService.pipelineSummary());
  app.get("/sovereignty-incidents/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const i = incidentOrchService.find(id);
    if (!i) return reply.code(404).send({ error: "not_found" });
    return i;
  });
}
