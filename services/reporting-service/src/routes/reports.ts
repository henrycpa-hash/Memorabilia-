import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "@crownx-jewel/shared-auth/guards";
import { reportingService } from "../domain/reporting.service";

const reportSchema = z.object({
  reportType: z.enum([
    "board_executive",
    "creator_performance",
    "risk_and_trust",
    "settlement_and_payout",
    "campaign_and_experiment",
    "regulatory_export"
  ]),
  format: z.enum(["json", "csv", "xlsx", "pdf"]).default("json"),
  scope: z
    .object({
      creatorId: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional()
    })
    .optional()
});

export function registerReportingRoutes(app: FastifyInstance) {
  app.post(
    "/reports",
    { preHandler: requireRole("admin") },
    async (request, reply) => {
      const input = reportSchema.parse(request.body);
      const r = await reportingService.generate(input);
      reply.code(201).send(r);
    }
  );

  app.get(
    "/reports",
    { preHandler: requireRole("admin") },
    async () => reportingService.list()
  );

  app.get("/reports/:id", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = reportingService.findById(id);
    if (!r) return reply.code(404).send({ error: "not_found" });
    return r;
  });
}
