import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "@crownx-jewel/shared-auth/guards";
import { erpService } from "../domain/erp.service";

const profileSchema = z.object({
  tenantId: z.string().optional(),
  provider: z.enum(["netsuite", "quickbooks", "xero", "sap", "oracle_fusion", "generic_csv"]),
  name: z.string().min(1),
  mappingJson: z.record(z.unknown()).optional()
});

const exportSchema = z.object({
  exportType: z.enum(["journal_entries", "invoices", "payouts", "tax_summaries", "royalty_statements"]),
  sourceExportPackageId: z.string().optional(),
  batchKey: z.string().optional()
});

const ackSchema = z.object({
  status: z.enum(["accepted", "partially_accepted", "rejected"]),
  acceptedRows: z.number().int().nonnegative().optional(),
  rejectedRows: z.number().int().nonnegative().optional(),
  exceptionLines: z.array(z.object({ row: z.number().int(), reason: z.string() })).optional(),
  payloadJson: z.record(z.unknown()).optional()
});

export function registerErpRoutes(app: FastifyInstance) {
  app.post("/erp/profiles", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = profileSchema.parse(request.body);
    const p = await erpService.createProfile(input);
    reply.code(201).send(p);
  });
  app.get("/erp/profiles", async () => erpService.listProfiles());
  app.get("/erp/profiles/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const p = erpService.findProfile(id);
    if (!p) return reply.code(404).send({ error: "not_found" });
    return p;
  });

  app.post("/erp/profiles/:id/exports", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = exportSchema.parse(request.body);
    const e = await erpService.pushExport({ profileId: id, ...input });
    if (!e) return reply.code(404).send({ error: "profile_not_found" });
    reply.code(201).send(e);
  });
  app.get("/erp/profiles/:id/exports", async (request) => {
    const { id } = request.params as { id: string };
    return erpService.exportsForProfile(id);
  });
  app.get("/erp/exports", { preHandler: requireRole("admin") }, async () => erpService.listExports());
  app.get("/erp/exports/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const e = erpService.findExport(id);
    if (!e) return reply.code(404).send({ error: "not_found" });
    return e;
  });

  app.post("/erp/exports/:id/ack", async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = ackSchema.parse(request.body);
    const a = await erpService.receiveAck({ exportId: id, ...input });
    if (!a) return reply.code(404).send({ error: "export_not_found" });
    reply.code(201).send(a);
  });
  app.get("/erp/exports/:id/acks", async (request) => {
    const { id } = request.params as { id: string };
    return erpService.acksForExport(id);
  });
}
