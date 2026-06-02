import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { coaService } from "../domain/coa.service";

const issueCoaSchema = z.object({
  assetId: z.string(),
  authCaseId: z.string()
});

export function registerCoaRoutes(app: FastifyInstance) {
  app.post("/coa/issue", async (request, reply) => {
    const input = issueCoaSchema.parse(request.body);
    const coa = await coaService.issue(input);
    reply.code(201).send(coa);
  });

  app.get("/coa", async () => coaService.list());

  app.get("/coa/by-asset/:assetId", async (request, reply) => {
    const { assetId } = request.params as { assetId: string };
    const coa = coaService.findByAssetId(assetId);
    if (!coa) return reply.code(404).send({ error: "not_found" });
    return coa;
  });
}
