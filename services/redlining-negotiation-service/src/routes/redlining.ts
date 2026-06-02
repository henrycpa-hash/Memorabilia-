import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, requireRole } from "@crownx-jewel/shared-auth/guards";
import { redliningService } from "../domain/redlining.service";

const versionSchema = z.object({
  agreementId: z.string(),
  versionNumber: z.number().int().positive().optional(),
  contentUri: z.string(),
  clauseBodies: z.record(z.string())
});

const diffSchema = z.object({
  baseVersionId: z.string(),
  compareVersionId: z.string()
});

const issueSchema = z.object({
  agreementId: z.string(),
  issueType: z.enum(["clause_change_requested", "fallback_invoked", "term_dispute", "missing_term", "policy_violation"]),
  clauseKey: z.string().optional(),
  description: z.string().min(1),
  payload: z.record(z.unknown()).optional()
});

const clauseSchema = z.object({
  clauseKey: z.string(),
  category: z.enum([
    "indemnification", "liability_limit", "termination", "ip_ownership",
    "data_processing", "payment_terms", "warranty", "confidentiality", "governing_law", "audit_rights"
  ]),
  languageBody: z.string().min(1),
  fallbackRank: z.number().int().nonnegative(),
  requiresLegalReview: z.boolean()
});

export function registerRedliningRoutes(app: FastifyInstance) {
  app.post("/redlines/versions", { preHandler: requireAuth }, async (request, reply) => {
    const input = versionSchema.parse(request.body);
    const v = await redliningService.createVersion({
      ...input,
      authorUserId: request.auth!.userId
    });
    reply.code(201).send(v);
  });
  app.post("/redlines/versions/:id/status", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: never };
    const v = redliningService.updateVersionStatus(id, status);
    if (!v) return reply.code(404).send({ error: "not_found" });
    return v;
  });
  app.get("/redlines/versions", async (request) => {
    const { agreementId } = request.query as { agreementId?: string };
    return redliningService.listVersions(agreementId);
  });
  app.get("/redlines/versions/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const v = redliningService.findVersion(id);
    if (!v) return reply.code(404).send({ error: "not_found" });
    return v;
  });

  app.post("/redlines/diffs", { preHandler: requireAuth }, async (request, reply) => {
    const input = diffSchema.parse(request.body);
    const d = await redliningService.computeDiff(input);
    if (!d) return reply.code(404).send({ error: "version_not_found" });
    reply.code(201).send(d);
  });
  app.post("/redlines/diffs/:id/review", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { accept } = request.body as { accept: boolean };
    const d = redliningService.reviewDiff(id, !!accept);
    if (!d) return reply.code(404).send({ error: "not_found" });
    return d;
  });
  app.get("/redlines/diffs", async (request) => {
    const { agreementId } = request.query as { agreementId?: string };
    return redliningService.listDiffs(agreementId);
  });
  app.get("/redlines/diffs/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const d = redliningService.findDiff(id);
    if (!d) return reply.code(404).send({ error: "not_found" });
    return d;
  });

  app.post("/redlines/issues", { preHandler: requireAuth }, async (request, reply) => {
    const input = issueSchema.parse(request.body);
    const i = await redliningService.createIssue(input);
    reply.code(201).send(i);
  });
  app.post("/redlines/issues/:id/resolve", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: "resolved" | "deferred" | "rejected" };
    const i = redliningService.resolveIssue(id, status);
    if (!i) return reply.code(404).send({ error: "not_found" });
    return i;
  });
  app.get("/redlines/issues", async (request) => {
    const { agreementId } = request.query as { agreementId?: string };
    return redliningService.listIssues(agreementId);
  });
  app.get("/redlines/issues/open", async () => redliningService.openIssues());

  app.post("/redlines/clauses", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = clauseSchema.parse(request.body);
    const c = await redliningService.addToClauseLibrary(input);
    reply.code(201).send(c);
  });
  app.get("/redlines/clauses", async (request) => {
    const { category } = request.query as { category?: string };
    return category ? redliningService.clausesByCategory(category as never) : redliningService.listClauseLibrary();
  });
  app.get("/redlines/clauses/:clauseKey/fallback/:rank", async (request, reply) => {
    const { clauseKey, rank } = request.params as { clauseKey: string; rank: string };
    const c = redliningService.getNextFallback(clauseKey, Number(rank));
    if (!c) return reply.code(404).send({ error: "no_fallback" });
    return c;
  });
}
