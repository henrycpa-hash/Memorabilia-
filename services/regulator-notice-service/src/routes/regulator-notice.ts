import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, requireRole } from "@crownx-jewel/shared-auth/guards";
import { lookupRouting, regulatorNoticeService } from "../domain/regulator-notice.service";

const SOURCE_TYPES = [
  "incident", "data_breach", "legal_escalation", "compliance_finding",
  "sovereign_event", "tax_finding", "voluntary_disclosure"
] as const;

const STATUSES = [
  "draft", "approval_pending", "approved", "submitted", "acknowledged", "responded", "rejected", "closed"
] as const;

const SEVERITIES = ["low", "medium", "high", "critical"] as const;

const generateSchema = z.object({
  jurisdictionKey: z.string().min(1),
  sourceType: z.enum(SOURCE_TYPES),
  sourceId: z.string(),
  severity: z.enum(SEVERITIES),
  triggerAt: z.string().optional(),
  title: z.string().min(1),
  payload: z.record(z.unknown()).optional()
});

const routingRuleSchema = z.object({
  jurisdictionKey: z.string(),
  sourceType: z.enum(SOURCE_TYPES),
  regulatorKey: z.string(),
  regulatorName: z.string(),
  deadlineDays: z.number().int().nonnegative(),
  responsePackRequired: z.boolean()
});

const responseSchema = z.object({ responsePackUri: z.string().min(1) });
const rejectSchema = z.object({ submissionId: z.string(), reason: z.string().min(1) });

export function registerRegulatorNoticeRoutes(app: FastifyInstance) {
  // Routing rules
  app.post("/regulator-notices/routing", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = routingRuleSchema.parse(request.body);
    const r = await regulatorNoticeService.addRoutingRule(input as never);
    reply.code(201).send(r);
  });
  app.get("/regulator-notices/routing", async () => regulatorNoticeService.listRouting());
  app.get("/regulator-notices/routing/lookup", async (request) => {
    const { jurisdiction, sourceType } = request.query as { jurisdiction: string; sourceType: typeof SOURCE_TYPES[number] };
    return lookupRouting(jurisdiction, sourceType);
  });

  // Notice generation
  app.post("/regulator-notices", { preHandler: requireRole("compliance_officer", "admin") }, async (request, reply) => {
    const input = generateSchema.parse(request.body);
    const ns = await regulatorNoticeService.generate(input);
    reply.code(201).send(ns);
  });

  // Lifecycle
  app.post("/regulator-notices/:id/request-approval", { preHandler: requireRole("compliance_officer", "admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const n = regulatorNoticeService.requestApproval(id);
    if (!n) return reply.code(404).send({ error: "not_found" });
    return n;
  });
  app.post("/regulator-notices/:id/approve", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const n = regulatorNoticeService.approve(id, request.auth!.userId);
    if (!n) return reply.code(404).send({ error: "not_found" });
    return n;
  });
  app.post("/regulator-notices/:id/submit", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await regulatorNoticeService.submit(id);
    if (!r) return reply.code(409).send({ error: "not_approved_or_not_found" });
    reply.code(201).send(r);
  });
  app.post("/regulator-notices/:id/respond", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { responsePackUri } = responseSchema.parse(request.body);
    const n = regulatorNoticeService.recordResponse({ id, responsePackUri });
    if (!n) return reply.code(404).send({ error: "not_found" });
    return n;
  });
  app.post("/regulator-notices/:id/close", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const n = regulatorNoticeService.close(id);
    if (!n) return reply.code(404).send({ error: "not_found" });
    return n;
  });

  // Submissions
  app.post("/regulator-notices/submissions/:id/acknowledge", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const s = await regulatorNoticeService.acknowledgeSubmission({ submissionId: id });
    if (!s) return reply.code(404).send({ error: "not_found" });
    return s;
  });
  app.post("/regulator-notices/submissions/reject", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = rejectSchema.parse(request.body);
    const s = regulatorNoticeService.reject(input);
    if (!s) return reply.code(404).send({ error: "not_found" });
    return s;
  });
  app.get("/regulator-notices/submissions", async (request) => {
    const { noticeId } = request.query as { noticeId?: string };
    return regulatorNoticeService.listSubmissions(noticeId);
  });

  // Reads
  app.get("/regulator-notices", async (request) => {
    const { status } = request.query as { status?: typeof STATUSES[number] };
    return regulatorNoticeService.list(status);
  });
  app.get("/regulator-notices/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const n = regulatorNoticeService.find(id);
    if (!n) return reply.code(404).send({ error: "not_found" });
    return n;
  });
  app.get("/regulator-notices/by-source/:type/:sourceId", async (request) => {
    const { type, sourceId } = request.params as { type: typeof SOURCE_TYPES[number]; sourceId: string };
    return regulatorNoticeService.bySource(type, sourceId);
  });
  app.get("/regulator-notices/upcoming-deadlines", async (request) => {
    const { windowDays } = request.query as { windowDays?: string };
    return regulatorNoticeService.upcomingDeadlines(windowDays ? Number(windowDays) : 14);
  });
  app.get("/regulator-notices/pipeline-summary", async () => regulatorNoticeService.pipelineSummary());
}
