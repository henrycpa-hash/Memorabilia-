import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, requireRole } from "@crownx-jewel/shared-auth/guards";
import { realtimeCollabService } from "../domain/realtime-collab.service";

const WORKSPACE_TYPES = ["redline_workspace", "diligence_workspace", "regulator_response", "incident_war_room"] as const;
const PRESENCE_STATES = ["active", "idle", "away", "left"] as const;
const OP_KINDS = [
  "comment_added", "comment_resolved", "clause_proposed", "clause_accepted", "clause_rejected",
  "section_locked", "section_unlocked", "checkpoint_requested"
] as const;

const sessionSchema = z.object({
  workspaceType: z.enum(WORKSPACE_TYPES),
  workspaceId: z.string()
});

const presenceSchema = z.object({
  state: z.enum(PRESENCE_STATES).optional(),
  cursorAnchor: z.string().optional()
});

const opSchema = z.object({
  kind: z.enum(OP_KINDS),
  anchor: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
  expectedSequence: z.number().int().nonnegative().optional()
});

const checkpointSchema = z.object({ label: z.string().min(1) });

export function registerRealtimeCollabRoutes(app: FastifyInstance) {
  app.post("/realtime/sessions", { preHandler: requireAuth }, async (request, reply) => {
    const input = sessionSchema.parse(request.body);
    const s = await realtimeCollabService.startSession(input);
    reply.code(201).send(s);
  });
  app.post("/realtime/sessions/:id/pause", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const s = realtimeCollabService.pauseSession(id);
    if (!s) return reply.code(404).send({ error: "not_found" });
    return s;
  });
  app.post("/realtime/sessions/:id/resume", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const s = realtimeCollabService.resumeSession(id);
    if (!s) return reply.code(404).send({ error: "not_found" });
    return s;
  });
  app.post("/realtime/sessions/:id/close", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const s = realtimeCollabService.closeSession(id);
    if (!s) return reply.code(404).send({ error: "not_found" });
    return s;
  });
  app.get("/realtime/sessions", async (request) => {
    const { workspaceType, workspaceId } = request.query as { workspaceType?: typeof WORKSPACE_TYPES[number]; workspaceId?: string };
    return realtimeCollabService.listSessions(workspaceType, workspaceId);
  });
  app.get("/realtime/sessions/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const s = realtimeCollabService.findSession(id);
    if (!s) return reply.code(404).send({ error: "not_found" });
    return s;
  });

  // Presence
  app.put("/realtime/sessions/:id/presence", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = presenceSchema.parse(request.body || {});
    const p = realtimeCollabService.upsertPresence({ sessionId: id, userId: request.auth!.userId, ...input });
    if (!p) return reply.code(404).send({ error: "not_found" });
    return p;
  });
  app.delete("/realtime/sessions/:id/presence", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const p = realtimeCollabService.leavePresence({ sessionId: id, userId: request.auth!.userId });
    if (!p) return reply.code(404).send({ error: "not_found" });
    return p;
  });
  app.get("/realtime/sessions/:id/presence", async (request) => {
    const { id } = request.params as { id: string };
    return realtimeCollabService.listPresence(id);
  });
  app.post("/realtime/presence/sweep-idle", { preHandler: requireRole("admin") }, async () =>
    realtimeCollabService.sweepIdle()
  );

  // Operations
  app.post("/realtime/sessions/:id/operations", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = opSchema.parse(request.body);
    const op = await realtimeCollabService.applyOperation({ sessionId: id, actorUserId: request.auth!.userId, ...input });
    if (!op) return reply.code(404).send({ error: "session_not_found" });
    if (!op.accepted) return reply.code(409).send(op);
    reply.code(201).send(op);
  });
  app.get("/realtime/sessions/:id/operations", async (request) => {
    const { id } = request.params as { id: string };
    const { acceptedOnly } = request.query as { acceptedOnly?: string };
    return realtimeCollabService.listOperations(id, { acceptedOnly: acceptedOnly === "true" });
  });

  // Checkpoints
  app.post("/realtime/sessions/:id/checkpoints", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { label } = checkpointSchema.parse(request.body);
    const s = await realtimeCollabService.publishCheckpoint({ sessionId: id, actorUserId: request.auth!.userId, label });
    if (!s) return reply.code(404).send({ error: "not_found" });
    return s;
  });

  // Events
  app.get("/realtime/sessions/:id/events", async (request) => {
    const { id } = request.params as { id: string };
    return realtimeCollabService.listEvents(id);
  });

  app.get("/realtime/pipeline-summary", async () => realtimeCollabService.pipelineSummary());
}
