import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, requireRole } from "@crownx-jewel/shared-auth/guards";
import { attestationExportService } from "../domain/attestation-export.service";

const PACKET_TYPES = ["tenant_period_summary", "key_usage_chain", "control_summary", "audit_bundle", "regulator_disclosure"] as const;
const EXPORT_TARGETS = ["external_auditor", "regulator_authority", "partner_review", "internal_archive", "tenant_self_service"] as const;

const assembleSchema = z.object({
  tenantId: z.string(),
  packetType: z.enum(PACKET_TYPES),
  periodKey: z.string().min(1),
  sourceOverrides: z.array(z.object({
    referenceType: z.string(),
    referenceId: z.string(),
    content: z.string()
  })).optional(),
  wrapInLegalPacket: z.boolean().optional()
});

const verifySchema = z.object({
  content: z.array(z.object({
    referenceType: z.string(),
    referenceId: z.string(),
    content: z.string()
  }))
});

const exportSchema = z.object({
  packetId: z.string(),
  exportTargetType: z.enum(EXPORT_TARGETS),
  exportTargetId: z.string().optional()
});

const denySchema = z.object({ reason: z.string().min(1) });

export function registerAttestationExportRoutes(app: FastifyInstance) {
  app.post("/attestation/packets", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = assembleSchema.parse(request.body);
    const p = await attestationExportService.assemble(input as never);
    reply.code(201).send(p);
  });
  app.post("/attestation/packets/:id/sign", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const p = attestationExportService.signPacket(id);
    if (!p) return reply.code(404).send({ error: "not_found" });
    return p;
  });
  app.post("/attestation/packets/:id/revoke", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const p = attestationExportService.revokePacket(id);
    if (!p) return reply.code(404).send({ error: "not_found" });
    return p;
  });
  app.post("/attestation/packets/:id/verify", async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = verifySchema.parse(request.body);
    const map = new Map<string, string>();
    for (const c of input.content) map.set(`${c.referenceType}:${c.referenceId}`, c.content);
    const r = attestationExportService.verifyPacket(id, map);
    if (!r) return reply.code(404).send({ error: "not_found" });
    return r;
  });
  app.get("/attestation/packets", async (request) => {
    const { tenantId, status } = request.query as { tenantId?: string; status?: typeof PACKET_TYPES[number] };
    return attestationExportService.listPackets(tenantId, status as never);
  });
  app.get("/attestation/packets/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const p = attestationExportService.findPacket(id);
    if (!p) return reply.code(404).send({ error: "not_found" });
    return p;
  });

  // Exports
  app.post("/attestation/exports", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = exportSchema.parse(request.body);
    const e = await attestationExportService.requestExport(input);
    if (!e) return reply.code(409).send({ error: "packet_not_signed" });
    reply.code(201).send(e);
  });
  app.post("/attestation/exports/:id/approve", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const e = await attestationExportService.approveExport({ id, approverUserId: request.auth!.userId });
    if (!e) return reply.code(404).send({ error: "not_found" });
    return e;
  });
  app.post("/attestation/exports/:id/deny", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { reason } = denySchema.parse(request.body);
    const e = attestationExportService.denyExport({ id, approverUserId: request.auth!.userId, reason });
    if (!e) return reply.code(404).send({ error: "not_found" });
    return e;
  });
  app.get("/attestation/exports", async (request) => {
    const { packetId } = request.query as { packetId?: string };
    return attestationExportService.listExports(packetId);
  });
  app.get("/attestation/exports/pending", async () => attestationExportService.pendingExports());
  app.get("/attestation/exports/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const e = attestationExportService.findExport(id);
    if (!e) return reply.code(404).send({ error: "not_found" });
    return e;
  });
  app.get("/attestation/pipeline-summary", async () => attestationExportService.pipelineSummary());
}
