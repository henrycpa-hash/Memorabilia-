import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, requireRole } from "@crownx-jewel/shared-auth/guards";
import { escalationService } from "../domain/escalation.service";

const SOURCE_TYPES = [
  "dispute", "claim", "compliance_block", "partner_economics",
  "residency_breach", "regulator_trigger", "sovereign_restriction"
] as const;

const SEVERITIES = [
  "advisory", "urgent_review", "legal_hold_candidate", "regulator_sensitive", "executive_escalation"
] as const;

const STATUSES = [
  "open", "routed_internal", "routed_external", "matter_opened", "packet_assembled", "resolved", "withdrawn"
] as const;

const ROUTING_TARGETS = ["internal_legal", "external_counsel", "executive_counsel"] as const;

const createSchema = z.object({
  sourceType: z.enum(SOURCE_TYPES),
  sourceId: z.string(),
  severity: z.enum(SEVERITIES),
  metadata: z.record(z.unknown()).optional()
});

const severitySchema = z.object({ severity: z.enum(SEVERITIES) });
const routingSchema = z.object({ target: z.enum(ROUTING_TARGETS) });
const matterSchema = z.object({ matterRef: z.string().optional(), connectorKey: z.string().optional() });
const packetSchema = z.object({ packetType: z.string().optional() });
const resolveSchema = z.object({ resolutionNotes: z.string().optional() });
const withdrawSchema = z.object({ reason: z.string().min(1) });

export function registerEscalationRoutes(app: FastifyInstance) {
  app.post("/legal-escalations", { preHandler: requireRole("compliance_officer", "admin") }, async (request, reply) => {
    const input = createSchema.parse(request.body);
    const e = await escalationService.create(input);
    reply.code(201).send(e);
  });
  app.put("/legal-escalations/:id/severity", { preHandler: requireRole("compliance_officer", "admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { severity } = severitySchema.parse(request.body);
    const e = escalationService.changeSeverity(id, severity);
    if (!e) return reply.code(404).send({ error: "not_found" });
    return e;
  });
  app.post("/legal-escalations/:id/route", { preHandler: requireRole("compliance_officer", "admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { target } = routingSchema.parse(request.body);
    const e = escalationService.acceptRouting(id, target);
    if (!e) return reply.code(404).send({ error: "not_found" });
    return e;
  });
  app.post("/legal-escalations/:id/matter", { preHandler: requireRole("compliance_officer", "admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = matterSchema.parse(request.body || {});
    const e = await escalationService.openOrLinkMatter({ id, ...input });
    if (!e) return reply.code(404).send({ error: "not_found" });
    return e;
  });
  app.post("/legal-escalations/:id/packet", { preHandler: requireRole("compliance_officer", "admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = packetSchema.parse(request.body || {});
    const e = await escalationService.assemblePacket({ id, ...input });
    if (!e) return reply.code(404).send({ error: "not_found" });
    return e;
  });
  app.post("/legal-escalations/:id/resolve", { preHandler: requireRole("compliance_officer", "admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { resolutionNotes } = resolveSchema.parse(request.body || {});
    const e = escalationService.resolve(id, resolutionNotes);
    if (!e) return reply.code(404).send({ error: "not_found" });
    return e;
  });
  app.post("/legal-escalations/:id/withdraw", { preHandler: requireRole("compliance_officer", "admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { reason } = withdrawSchema.parse(request.body);
    const e = escalationService.withdraw(id, reason);
    if (!e) return reply.code(404).send({ error: "not_found" });
    return e;
  });

  app.get("/legal-escalations", async (request) => {
    const { status, severity } = request.query as {
      status?: typeof STATUSES[number];
      severity?: typeof SEVERITIES[number];
    };
    return escalationService.list(status, severity);
  });
  app.get("/legal-escalations/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const e = escalationService.find(id);
    if (!e) return reply.code(404).send({ error: "not_found" });
    return e;
  });
  app.get("/legal-escalations/by-source/:type/:sourceId", async (request, reply) => {
    const { type, sourceId } = request.params as { type: typeof SOURCE_TYPES[number]; sourceId: string };
    const e = escalationService.bySource(type, sourceId);
    if (!e) return reply.code(404).send({ error: "not_found" });
    return e;
  });
  app.get("/legal-escalations/:id/events", async (request) => {
    const { id } = request.params as { id: string };
    return escalationService.eventsForEscalation(id);
  });
  app.get("/legal-escalations/pipeline-summary", async () => escalationService.pipelineSummary());
}
