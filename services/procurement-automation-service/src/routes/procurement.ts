import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, requireRole } from "@crownx-jewel/shared-auth/guards";
import { procurementService } from "../domain/procurement.service";

const questionSchema = z.object({
  questionKey: z.string().min(1),
  prompt: z.string().min(1),
  category: z.enum(["security", "privacy", "compliance", "operations", "legal", "commercial"]),
  type: z.enum(["free_text", "yes_no", "select", "multi_select"]),
  options: z.array(z.string()).optional(),
  evidenceRequired: z.boolean()
});

const questionnaireSchema = z.object({
  templateKey: z.string().min(1),
  title: z.string().min(1),
  questions: z.array(questionSchema).min(1)
});

const responseSchema = z.object({
  questionnaireId: z.string(),
  tenantId: z.string(),
  buyerName: z.string().min(1),
  reviewerUserIds: z.array(z.string()).optional()
});

const answerSchema = z.object({
  questionKey: z.string(),
  value: z.union([z.string(), z.array(z.string())]),
  evidenceRef: z.string().optional(),
  reusedFromResponseId: z.string().optional(),
  lastReviewedByUserId: z.string().optional()
});

const evidenceSchema = z.object({
  questionnaireId: z.string(),
  questionKey: z.string(),
  evidenceRef: z.string(),
  evidenceType: z.enum(["audit_packet", "policy_pack", "doc_url", "asset", "agreement"]),
  description: z.string()
});

export function registerProcurementRoutes(app: FastifyInstance) {
  app.post("/procurement/questionnaires", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = questionnaireSchema.parse(request.body);
    const q = await procurementService.createQuestionnaire(input as never);
    reply.code(201).send(q);
  });
  app.post("/procurement/questionnaires/:id/archive", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const q = procurementService.archiveQuestionnaire(id);
    if (!q) return reply.code(404).send({ error: "not_found" });
    return q;
  });
  app.get("/procurement/questionnaires", async () => procurementService.listQuestionnaires());
  app.get("/procurement/questionnaires/by-template/:templateKey", async (request, reply) => {
    const { templateKey } = request.params as { templateKey: string };
    const q = procurementService.questionnaireByTemplate(templateKey);
    if (!q) return reply.code(404).send({ error: "not_found" });
    return q;
  });
  app.get("/procurement/questionnaires/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const q = procurementService.findQuestionnaire(id);
    if (!q) return reply.code(404).send({ error: "not_found" });
    return q;
  });

  app.post("/procurement/responses", { preHandler: requireAuth }, async (request, reply) => {
    const input = responseSchema.parse(request.body);
    const r = await procurementService.createResponse(input);
    if (!r) return reply.code(404).send({ error: "questionnaire_not_found" });
    reply.code(201).send(r);
  });
  app.put("/procurement/responses/:id/answers", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({ answers: z.array(answerSchema) }).parse(request.body);
    const r = procurementService.saveAnswers(id, body.answers as never);
    if (!r) return reply.code(404).send({ error: "not_found" });
    return r;
  });
  app.get("/procurement/responses/:id/reuse-suggestions", async (request) => {
    const { id } = request.params as { id: string };
    return procurementService.reuseSuggestions(id);
  });
  app.post("/procurement/responses/:id/submit", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await procurementService.submitResponse(id);
    if (!result) return reply.code(404).send({ error: "not_found" });
    return result;
  });
  app.post("/procurement/responses/:id/mark-delivered", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = procurementService.markDelivered(id);
    if (!r) return reply.code(404).send({ error: "not_found" });
    return r;
  });
  app.get("/procurement/responses/:id/score", async (request, reply) => {
    const { id } = request.params as { id: string };
    const s = procurementService.score(id);
    if (!s) return reply.code(404).send({ error: "not_found" });
    return s;
  });
  app.get("/procurement/responses", async (request) => {
    const { tenantId } = request.query as { tenantId?: string };
    return procurementService.listResponses(tenantId);
  });
  app.get("/procurement/responses/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = procurementService.findResponse(id);
    if (!r) return reply.code(404).send({ error: "not_found" });
    return r;
  });

  app.post("/procurement/evidence-maps", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = evidenceSchema.parse(request.body);
    const m = await procurementService.addEvidenceMap(input);
    if (!m) return reply.code(404).send({ error: "questionnaire_not_found" });
    reply.code(201).send(m);
  });
  app.get("/procurement/evidence-maps", async (request) => {
    const { questionnaireId } = request.query as { questionnaireId?: string };
    return procurementService.listEvidenceMaps(questionnaireId);
  });
}
