import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "@crownx-jewel/shared-auth/guards";
import { portalConnectorService } from "../domain/portal-connector.service";

const PROVIDERS = ["edpb_portal", "ico_portal", "bfdi_portal", "hmrc_gateway", "irs_efile", "ny_dfs_portal", "cisa_portal", "manual_email"] as const;
const PORTAL_STATUSES = ["active", "degraded", "suspended"] as const;
const REF_STATUSES = ["pending", "accepted", "rejected", "withdrawn"] as const;
const RESPONSE_TYPES = ["acknowledgement", "request_for_info", "decision_letter", "rejection_notice", "extension_grant", "closure_notice"] as const;

const portalSchema = z.object({
  jurisdictionKey: z.string(),
  regulatorKey: z.string(),
  provider: z.enum(PROVIDERS),
  status: z.enum(PORTAL_STATUSES).default("active"),
  config: z.record(z.unknown()).default({})
});

const submitSchema = z.object({
  noticeId: z.string(),
  jurisdictionKey: z.string(),
  regulatorKey: z.string(),
  originalDueDate: z.string()
});

const inboundSchema = z.object({
  externalRef: z.string(),
  responseType: z.enum(RESPONSE_TYPES),
  payload: z.record(z.unknown()).optional(),
  newDueDate: z.string().optional(),
  extensionDays: z.number().int().nonnegative().optional()
});

const responsePackSchema = z.object({ outputUri: z.string().optional() });

export function registerPortalConnectorRoutes(app: FastifyInstance) {
  // Portals
  app.post("/regulator-portals", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = portalSchema.parse(request.body);
    const p = await portalConnectorService.createPortal(input as never);
    reply.code(201).send(p);
  });
  app.get("/regulator-portals", async (request) => {
    const { jurisdiction } = request.query as { jurisdiction?: string };
    return portalConnectorService.listPortals(jurisdiction);
  });
  app.get("/regulator-portals/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const p = portalConnectorService.findPortal(id);
    if (!p) return reply.code(404).send({ error: "not_found" });
    return p;
  });

  // Portal refs
  app.post("/regulator-portals/refs", { preHandler: requireRole("compliance_officer", "admin") }, async (request, reply) => {
    const input = submitSchema.parse(request.body);
    const r = await portalConnectorService.submitNotice(input);
    if (!r) return reply.code(404).send({ error: "no_active_portal_for_regulator" });
    reply.code(201).send(r);
  });
  app.get("/regulator-portals/refs", async (request) => {
    const { status } = request.query as { status?: typeof REF_STATUSES[number] };
    return portalConnectorService.listPortalRefs(status);
  });
  app.get("/regulator-portals/refs/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = portalConnectorService.findPortalRef(id);
    if (!r) return reply.code(404).send({ error: "not_found" });
    return r;
  });
  app.get("/regulator-portals/refs/by-external/:externalRef", async (request, reply) => {
    const { externalRef } = request.params as { externalRef: string };
    const r = portalConnectorService.refByExternalRef(externalRef);
    if (!r) return reply.code(404).send({ error: "not_found" });
    return r;
  });

  // Inbound responses
  app.post("/regulator-portals/inbound", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = inboundSchema.parse(request.body);
    const r = await portalConnectorService.ingestInboundResponse(input);
    if (!r) return reply.code(404).send({ error: "external_ref_not_found" });
    reply.code(201).send(r);
  });
  app.post("/regulator-portals/inbound/:id/response-pack", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = responsePackSchema.parse(request.body || {});
    const r = await portalConnectorService.generateResponsePack({ responseId: id, ...input });
    if (!r) return reply.code(404).send({ error: "not_found" });
    return r;
  });
  app.get("/regulator-portals/inbound", async (request) => {
    const { portalRefId } = request.query as { portalRefId?: string };
    return portalConnectorService.listInboundResponses(portalRefId);
  });

  app.get("/regulator-portals/pipeline-summary", async () => portalConnectorService.pipelineSummary());
}
