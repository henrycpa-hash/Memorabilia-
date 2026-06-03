import type { FastifyInstance } from "fastify";
import { terms } from "../domain/terms.service";

export function registerTermsRoutes(app: FastifyInstance) {
  // ---- public transparency ----
  app.get("/terms", async () => ({ agreements: terms.registry() }));
  app.get("/terms/bundle", async () => terms.currentBundle());
  app.get("/terms/agreement/:key", async (request, reply) => {
    const { key } = request.params as { key: string };
    const { version } = request.query as { version?: string };
    const a = terms.getAgreement(key, version ? Number(version) : undefined);
    if (!a) return reply.code(404).send({ error: "agreement_not_found" });
    return a;
  });
  app.get("/terms/audit", async (request) => {
    const { key } = request.query as { key?: string };
    return terms.auditTrail(key);
  });

  // ---- acceptance (signed at sign-up) ----
  app.post("/terms/accept", async (request, reply) => {
    const b = (request.body || {}) as { userId?: string; method?: string };
    if (!b.userId) return reply.code(400).send({ error: "userId_required" });
    return terms.accept(b.userId, b.method);
  });
  app.get("/terms/acceptances/:userId", async (request) => {
    const { userId } = request.params as { userId: string };
    return terms.acceptancesFor(userId);
  });

  // ---- governance amendment workflow ----
  app.post("/terms/amendments", async (request, reply) => {
    const b = (request.body || {}) as { key?: string; title?: string; changesNote?: string; sections?: { heading: string; body: string }[] };
    if (!b.key || !b.changesNote || !Array.isArray(b.sections)) return reply.code(400).send({ error: "key_changesNote_sections_required" });
    const r = terms.propose({ key: b.key, title: b.title, changesNote: b.changesNote, sections: b.sections });
    if ("error" in r) return reply.code(404).send(r);
    return reply.code(201).send(r);
  });
  app.post("/terms/amendments/:id/approve", async (request, reply) => {
    const { id } = request.params as { id: string };
    const b = (request.body || {}) as { role?: string; approver?: string };
    if (!b.role || !b.approver) return reply.code(400).send({ error: "role_and_approver_required" });
    const r = terms.approve(id, b.role, b.approver);
    if ("error" in r) return reply.code(r.error === "amendment_not_found" ? 404 : 409).send(r);
    return r;
  });
  app.post("/terms/amendments/:id/activate", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = terms.activate(id);
    if ("error" in r) return reply.code(r.error === "amendment_not_found" ? 404 : 409).send(r);
    return r;
  });
  app.get("/terms/amendments", async () => ({ amendments: terms.amendments() }));
}
