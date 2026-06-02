import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, requireRole } from "@crownx-jewel/shared-auth/guards";
import { collabRedliningService } from "../domain/collab-redlining.service";

const REVIEWER_ROLES = ["internal_legal", "external_counsel", "business_owner", "counterparty", "executive_approver"] as const;
const POSITION_TYPES = ["accept", "reject", "propose_alternative", "request_review"] as const;
const CHECKPOINT_TYPES = ["draft_review", "internal_legal_review", "counterparty_review", "final_approval"] as const;
const COMMENT_STATUSES = ["open", "resolved", "rejected", "deferred"] as const;

const workspaceSchema = z.object({
  agreementId: z.string(),
  currentVersionId: z.string().optional(),
  reviewers: z.array(z.object({ userId: z.string(), role: z.enum(REVIEWER_ROLES) })).optional()
});

const commentSchema = z.object({
  workspaceId: z.string(),
  clauseKey: z.string().optional(),
  parentCommentId: z.string().optional(),
  body: z.string().min(1)
});

const positionSchema = z.object({
  workspaceId: z.string(),
  clauseKey: z.string(),
  actorRole: z.enum(REVIEWER_ROLES),
  positionType: z.enum(POSITION_TYPES),
  proposedLanguage: z.string().optional(),
  payload: z.record(z.unknown()).optional()
});

const checkpointSchema = z.object({
  workspaceId: z.string(),
  checkpointType: z.enum(CHECKPOINT_TYPES)
});

const decideSchema = z.object({
  status: z.enum(["approved", "rejected", "withdrawn"])
});

export function registerCollabRedliningRoutes(app: FastifyInstance) {
  // Workspaces
  app.post("/collab-redline/workspaces", { preHandler: requireAuth }, async (request, reply) => {
    const input = workspaceSchema.parse(request.body);
    const w = await collabRedliningService.openWorkspace(input);
    reply.code(201).send(w);
  });
  app.put("/collab-redline/workspaces/:id/status", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: never };
    const w = collabRedliningService.setWorkspaceStatus(id, status);
    if (!w) return reply.code(404).send({ error: "not_found" });
    return w;
  });
  app.put("/collab-redline/workspaces/:id/version", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { versionId } = request.body as { versionId: string };
    const w = collabRedliningService.setCurrentVersion(id, versionId);
    if (!w) return reply.code(404).send({ error: "not_found" });
    return w;
  });
  app.post("/collab-redline/workspaces/:id/reviewers", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId, role } = request.body as { userId: string; role: typeof REVIEWER_ROLES[number] };
    const w = collabRedliningService.assignReviewer(id, userId, role);
    if (!w) return reply.code(404).send({ error: "not_found" });
    return w;
  });
  app.post("/collab-redline/workspaces/:id/promote", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const w = await collabRedliningService.promoteToSignature(id);
    if (!w) return reply.code(409).send({ error: "not_approved" });
    return w;
  });
  app.get("/collab-redline/workspaces", async (request) => {
    const { agreementId, status } = request.query as { agreementId?: string; status?: string };
    if (status) return collabRedliningService.workspacesByStatus(status as never);
    return collabRedliningService.listWorkspaces(agreementId);
  });
  app.get("/collab-redline/workspaces/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const w = collabRedliningService.findWorkspace(id);
    if (!w) return reply.code(404).send({ error: "not_found" });
    return w;
  });
  app.get("/collab-redline/workspaces/:id/summary", async (request, reply) => {
    const { id } = request.params as { id: string };
    const s = collabRedliningService.workspaceSummary(id);
    if (!s) return reply.code(404).send({ error: "not_found" });
    return s;
  });

  // Comments
  app.post("/collab-redline/comments", { preHandler: requireAuth }, async (request, reply) => {
    const input = commentSchema.parse(request.body);
    const c = await collabRedliningService.addComment({ ...input, actorUserId: request.auth!.userId });
    if (!c) return reply.code(404).send({ error: "workspace_not_found" });
    reply.code(201).send(c);
  });
  app.post("/collab-redline/comments/:id/resolve", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = (request.body || {}) as { status?: typeof COMMENT_STATUSES[number] };
    const c = collabRedliningService.resolveComment(id, request.auth!.userId, status || "resolved");
    if (!c) return reply.code(404).send({ error: "not_found" });
    return c;
  });
  app.get("/collab-redline/workspaces/:id/comments", async (request) => {
    const { id } = request.params as { id: string };
    const { status } = request.query as { status?: typeof COMMENT_STATUSES[number] };
    return collabRedliningService.listComments(id, status);
  });

  // Positions
  app.post("/collab-redline/positions", { preHandler: requireAuth }, async (request, reply) => {
    const input = positionSchema.parse(request.body);
    const p = await collabRedliningService.recordPosition({ ...input, actorUserId: request.auth!.userId });
    if (!p) return reply.code(404).send({ error: "workspace_not_found" });
    reply.code(201).send(p);
  });
  app.get("/collab-redline/workspaces/:id/positions", async (request) => {
    const { id } = request.params as { id: string };
    return collabRedliningService.listPositions(id);
  });

  // Checkpoints
  app.post("/collab-redline/checkpoints", { preHandler: requireAuth }, async (request, reply) => {
    const input = checkpointSchema.parse(request.body);
    const c = await collabRedliningService.publishCheckpoint(input);
    if (!c) return reply.code(404).send({ error: "workspace_not_found" });
    reply.code(201).send(c);
  });
  app.post("/collab-redline/checkpoints/:id/decide", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = decideSchema.parse(request.body);
    const c = collabRedliningService.decideCheckpoint({ id, decidedByUserId: request.auth!.userId, status });
    if (!c) return reply.code(404).send({ error: "not_found" });
    return c;
  });
  app.get("/collab-redline/workspaces/:id/checkpoints", async (request) => {
    const { id } = request.params as { id: string };
    return collabRedliningService.listCheckpoints(id);
  });
}
