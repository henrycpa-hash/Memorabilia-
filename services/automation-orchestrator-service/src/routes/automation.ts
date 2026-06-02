import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "@crownx-jewel/shared-auth/guards";
import { automationService } from "../domain/automation.service";

const ruleSchema = z.object({
  id: z.string(),
  eventType: z.string(),
  audienceType: z.string(),
  templateKey: z.string(),
  channels: z.array(z.enum(["in_app", "email", "push"])).min(1),
  delayMinutes: z.number().int().nonnegative().default(0),
  enabled: z.boolean().default(true)
});

const triggerSchema = z.object({
  eventType: z.string(),
  payload: z.record(z.unknown()).default({})
});

export function registerAutomationRoutes(app: FastifyInstance) {
  app.get("/automation/rules", async () => automationService.listRules());

  app.post(
    "/automation/rules",
    { preHandler: requireRole("admin") },
    async (request, reply) => {
      const r = ruleSchema.parse(request.body);
      const stored = automationService.upsertRule(r);
      reply.code(201).send(stored);
    }
  );

  app.delete(
    "/automation/rules/:id",
    { preHandler: requireRole("admin") },
    async (request) => {
      const { id } = request.params as { id: string };
      automationService.removeRule(id);
      return { deleted: true, id };
    }
  );

  app.post("/automation/events", async (request, reply) => {
    const input = triggerSchema.parse(request.body);
    const result = await automationService.on(input);
    reply.send(result);
  });

  app.get("/automation/executions", async () => automationService.listExecutions());
}
