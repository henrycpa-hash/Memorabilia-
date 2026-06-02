import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, requireRole } from "@crownx-jewel/shared-auth/guards";
import { legalConnectorService } from "../domain/legal-connector.service";

const PROVIDERS = ["litera_clm", "ironclad", "icertis", "relativity", "everlaw", "legaltracker", "generic_filesystem"] as const;

const matterSchema = z.object({
  externalMatterId: z.string().min(1),
  provider: z.enum(PROVIDERS),
  matterTitle: z.string().min(1),
  associatedAgreementIds: z.array(z.string()).optional(),
  associatedDisputeIds: z.array(z.string()).optional(),
  payloadJson: z.record(z.unknown()).optional()
});

const exportSchema = z.object({ packetId: z.string() });

const callbackSchema = z.object({
  status: z.enum(["delivered", "failed"]),
  externalDocumentId: z.string().optional(),
  errorMessage: z.string().optional()
});

const holdSchema = z.object({
  custodianIds: z.array(z.string()).min(1),
  description: z.string().min(1)
});

export function registerLegalConnectorRoutes(app: FastifyInstance) {
  app.post("/legal-connector/matters", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = matterSchema.parse(request.body);
    const m = await legalConnectorService.createMatter(input);
    reply.code(201).send(m);
  });
  app.post("/legal-connector/matters/:id/status", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: never };
    const m = legalConnectorService.updateMatterStatus(id, status);
    if (!m) return reply.code(404).send({ error: "not_found" });
    return m;
  });
  app.get("/legal-connector/matters", async () => legalConnectorService.listMatters());
  app.get("/legal-connector/matters/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const m = legalConnectorService.findMatter(id);
    if (!m) return reply.code(404).send({ error: "not_found" });
    return m;
  });

  app.post("/legal-connector/matters/:id/exports", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = exportSchema.parse(request.body);
    const e = await legalConnectorService.exportPacket({ matterId: id, packetId: input.packetId });
    if (!e) return reply.code(404).send({ error: "matter_or_packet_not_found" });
    reply.code(201).send(e);
  });
  app.post("/legal-connector/exports/:id/callback", async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = callbackSchema.parse(request.body);
    const e = await legalConnectorService.ingestStatusCallback({ exportId: id, ...input });
    if (!e) return reply.code(404).send({ error: "not_found" });
    return e;
  });
  app.get("/legal-connector/exports", async (request) => {
    const { matterId } = request.query as { matterId?: string };
    return legalConnectorService.listExports(matterId);
  });
  app.get("/legal-connector/exports/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const e = legalConnectorService.findExport(id);
    if (!e) return reply.code(404).send({ error: "not_found" });
    return e;
  });

  app.post("/legal-connector/matters/:id/holds", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = holdSchema.parse(request.body);
    const h = await legalConnectorService.createHold({ matterId: id, ...input });
    if (!h) return reply.code(404).send({ error: "matter_not_found" });
    reply.code(201).send(h);
  });
  app.post("/legal-connector/holds/:id/release", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const h = legalConnectorService.releaseHold(id);
    if (!h) return reply.code(404).send({ error: "not_found" });
    return h;
  });
  app.get("/legal-connector/holds", async (request) => {
    const { matterId, active } = request.query as { matterId?: string; active?: string };
    if (active === "true") return legalConnectorService.activeHolds();
    return legalConnectorService.listHolds(matterId);
  });
}
