import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "@crownx-jewel/shared-auth/guards";
import { expService } from "../domain/exp.service";

const variantSchema = z.object({ key: z.string().min(1), weight: z.number().min(0).max(100) });

const createSchema = z.object({
  name: z.string().min(1),
  targetSurface: z.enum([
    "story_page_layout", "checkout_cta", "watchlist_prompt", "creator_campaign",
    "email_subject", "share_card_style", "drop_countdown_urgency"
  ]),
  hypothesis: z.string().min(1),
  variants: z.array(variantSchema).min(2),
  startAt: z.string(),
  endAt: z.string(),
  successMetric: z.string().min(1)
});

const exposeSchema = z.object({ subjectId: z.string().min(1) });
const convertSchema = z.object({
  subjectId: z.string().min(1),
  metricKey: z.string().min(1),
  value: z.number().optional()
});

export function registerExpRoutes(app: FastifyInstance) {
  app.post("/experiments", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = createSchema.parse(request.body);
    const e = expService.create(input);
    reply.code(201).send(e);
  });

  app.get("/experiments", async () => expService.list());
  app.get("/experiments/running", async () => expService.listRunning());
  app.get("/experiments/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const e = expService.findById(id);
    if (!e) return reply.code(404).send({ error: "not_found" });
    return e;
  });

  app.post("/experiments/:id/start", { preHandler: requireRole("admin") }, async (request) => {
    const { id } = request.params as { id: string };
    return expService.start(id);
  });
  app.post("/experiments/:id/pause", { preHandler: requireRole("admin") }, async (request) => {
    const { id } = request.params as { id: string };
    return expService.pause(id);
  });
  app.post("/experiments/:id/complete", { preHandler: requireRole("admin") }, async (request) => {
    const { id } = request.params as { id: string };
    return expService.complete(id);
  });

  app.post("/experiments/:id/expose", async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = exposeSchema.parse(request.body);
    const exposure = await expService.expose({ experimentId: id, subjectId: input.subjectId });
    if (!exposure) return reply.code(404).send({ error: "not_found" });
    reply.code(201).send(exposure);
  });

  app.post("/experiments/:id/convert", async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = convertSchema.parse(request.body);
    const c = await expService.convert({ experimentId: id, ...input });
    if (!c) return reply.code(404).send({ error: "no_exposure" });
    reply.code(201).send(c);
  });

  app.get("/experiments/:id/results", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = expService.results(id);
    if (!r) return reply.code(404).send({ error: "not_found" });
    return r;
  });
}
