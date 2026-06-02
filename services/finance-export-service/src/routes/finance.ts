import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "@crownx-jewel/shared-auth/guards";
import { financeExportService } from "../domain/finance.service";

const invoiceSchema = z.object({
  settlementId: z.string(),
  tenantId: z.string().optional(),
  invoiceType: z.enum([
    "platform_fee", "creator_payout", "royalty_disbursement", "campaign_billing", "partner_settlement"
  ]),
  amount: z.number().positive(),
  currency: z.string().default("USD"),
  partyId: z.string(),
  metadataJson: z.record(z.unknown()).optional()
});

const scopeSchema = z.object({
  tenantId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  periodYear: z.string().optional()
});

export function registerFinanceExportRoutes(app: FastifyInstance) {
  app.post("/finance/invoices", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = invoiceSchema.parse(request.body);
    const inv = await financeExportService.issueInvoice(input);
    reply.code(201).send(inv);
  });
  app.get("/finance/invoices", { preHandler: requireRole("admin") }, async () => financeExportService.listInvoices());
  app.get("/finance/invoices/by-settlement/:settlementId", async (request) => {
    const { settlementId } = request.params as { settlementId: string };
    return financeExportService.invoicesForSettlement(settlementId);
  });
  app.post("/finance/invoices/:id/mark-paid", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const inv = financeExportService.markInvoicePaid(id);
    if (!inv) return reply.code(404).send({ error: "not_found" });
    return inv;
  });
  app.post("/finance/invoices/:id/void", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const inv = financeExportService.voidInvoice(id);
    if (!inv) return reply.code(404).send({ error: "not_found" });
    return inv;
  });

  app.post("/finance/exports/royalty-statements", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = scopeSchema.parse(request.body || {});
    const pkg = await financeExportService.buildRoyaltyStatements(input);
    reply.code(201).send(pkg);
  });

  app.post("/finance/exports/journal-entries", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = scopeSchema.parse(request.body || {});
    const pkg = await financeExportService.buildJournalEntries(input);
    reply.code(201).send(pkg);
  });

  app.post("/finance/exports/tax-summaries", { preHandler: requireRole("admin") }, async (request, reply) => {
    const input = scopeSchema.parse(request.body || {});
    const pkg = await financeExportService.buildTaxSummaries(input);
    reply.code(201).send(pkg);
  });

  app.get("/finance/exports", { preHandler: requireRole("admin") }, async () => financeExportService.listExports());

  app.get("/finance/exports/:id", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const pkg = financeExportService.findExport(id);
    if (!pkg) return reply.code(404).send({ error: "not_found" });
    return pkg;
  });

  // Convenience: download CSV body
  app.get("/finance/exports/:id/csv", { preHandler: requireRole("admin") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const pkg = financeExportService.findExport(id);
    if (!pkg) return reply.code(404).send({ error: "not_found" });
    if (!pkg.csvBody) return reply.code(409).send({ error: "no_csv_body" });
    reply.header("content-type", "text/csv");
    reply.header("content-disposition", `attachment; filename="${pkg.exportType}-${pkg.id.slice(0, 8)}.csv"`);
    return pkg.csvBody;
  });
}
