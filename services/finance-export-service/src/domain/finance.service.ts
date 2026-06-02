import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import {
  rowsToCsv,
  type ExportFormat,
  type InvoiceStatus,
  type InvoiceType,
  type JournalEntry,
  type RoyaltyStatementRow,
  type TaxSummary
} from "@crownx-jewel/shared-finance-export";

const settlementBase = () =>
  process.env.SETTLEMENT_SERVICE_URL || "http://localhost:4015";
const ledgerBase = () =>
  process.env.LEDGER_SERVICE_URL || "http://localhost:4012";
const royaltyBase = () =>
  process.env.ROYALTY_SERVICE_URL || "http://localhost:4006";

async function fetchOk<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export type Invoice = {
  id: string;
  settlementId: string;
  tenantId: string | null;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  amount: string;
  currency: string;
  status: InvoiceStatus;
  partyId: string;
  metadataJson: Record<string, unknown>;
  createdAt: string;
};

export type ExportPackage = {
  id: string;
  exportType:
    | "invoice_batch"
    | "royalty_statements"
    | "tax_summaries"
    | "journal_entries"
    | "payout_export";
  format: ExportFormat;
  scope: { tenantId?: string; from?: string; to?: string };
  payloadJson: unknown;
  csvBody: string | null;
  createdAt: string;
};

const invoices: Invoice[] = [];
const exports: ExportPackage[] = [];

let invoiceSeq = 1000;
function nextInvoiceNumber() {
  invoiceSeq += 1;
  return `INV-${invoiceSeq}`;
}

export const financeExportService = {
  /**
   * Issue an invoice. Wave 5 settlements that completed get an invoice batch
   * via this route; partner / agency settlements can issue manual invoices.
   */
  async issueInvoice(input: {
    settlementId: string;
    tenantId?: string;
    invoiceType: InvoiceType;
    amount: number;
    currency?: string;
    partyId: string;
    metadataJson?: Record<string, unknown>;
  }): Promise<Invoice> {
    const inv: Invoice = {
      id: newId(),
      settlementId: input.settlementId,
      tenantId: input.tenantId || null,
      invoiceNumber: nextInvoiceNumber(),
      invoiceType: input.invoiceType,
      amount: input.amount.toFixed(2),
      currency: input.currency || "USD",
      status: "issued",
      partyId: input.partyId,
      metadataJson: input.metadataJson || {},
      createdAt: nowIso()
    };
    invoices.push(inv);
    await publishOutbox({
      id: newId(),
      eventType: "finance.invoice.issued",
      aggregateId: inv.id,
      aggregateType: "invoice",
      payload: inv,
      occurredAt: nowIso()
    });
    return inv;
  },

  markInvoicePaid(id: string) {
    const inv = invoices.find((x) => x.id === id);
    if (!inv) return null;
    inv.status = "paid";
    return inv;
  },

  voidInvoice(id: string) {
    const inv = invoices.find((x) => x.id === id);
    if (!inv) return null;
    inv.status = "void";
    return inv;
  },

  listInvoices: () => [...invoices].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  invoicesForSettlement: (s: string) => invoices.filter((i) => i.settlementId === s),

  /**
   * Build a royalty statements export from completed settlements.
   * Wave 6 keeps the row math simple: statement rows are derived from the
   * royalty rules service. Wave 7 wires a precise per-payee waterfall.
   */
  async buildRoyaltyStatements(scope: { from?: string; to?: string; tenantId?: string }): Promise<ExportPackage> {
    const settlements = await fetchOk<Array<{
      id: string;
      assetId: string;
      grossAmount: string;
      royaltyAmount: string;
      settlementState: string;
      createdAt: string;
    }>>(`${settlementBase()}/settlements`);
    const completed = (settlements || []).filter((s) => s.settlementState === "completed");

    const rows: RoyaltyStatementRow[] = [];
    for (const s of completed) {
      const rule = await fetchOk<{
        beneficiaries: Array<{ beneficiaryId: string; percentage: number }>;
      }>(`${royaltyBase()}/rules/by-asset/${s.assetId}`);
      if (!rule) continue;
      const royalty = Number(s.royaltyAmount);
      for (const b of rule.beneficiaries) {
        const slice = Math.round(royalty * (b.percentage / 100) * 100) / 100;
        if (slice <= 0) continue;
        rows.push({
          beneficiaryId: b.beneficiaryId,
          assetId: s.assetId,
          settlementId: s.id,
          grossAmount: Number(s.grossAmount),
          royaltyPercent: b.percentage,
          payoutAmount: slice,
          occurredAt: s.createdAt
        });
      }
    }

    const csv = rowsToCsv(rows.map((r) => ({
      beneficiaryId: r.beneficiaryId,
      assetId: r.assetId,
      settlementId: r.settlementId,
      grossAmount: r.grossAmount,
      royaltyPercent: r.royaltyPercent,
      payoutAmount: r.payoutAmount,
      occurredAt: r.occurredAt
    })));

    const pkg: ExportPackage = {
      id: newId(),
      exportType: "royalty_statements",
      format: "csv",
      scope,
      payloadJson: rows,
      csvBody: csv,
      createdAt: nowIso()
    };
    exports.push(pkg);
    await publishOutbox({
      id: newId(),
      eventType: "finance.export.created",
      aggregateId: pkg.id,
      aggregateType: "export_package",
      payload: { exportId: pkg.id, exportType: pkg.exportType, rows: rows.length },
      occurredAt: nowIso()
    });
    return pkg;
  },

  /** Build a journal-entries export — one entry per completed settlement. */
  async buildJournalEntries(scope: { from?: string; to?: string; tenantId?: string }): Promise<ExportPackage> {
    const settlements = await fetchOk<Array<{
      id: string;
      grossAmount: string;
      platformFeeAmount: string;
      royaltyAmount: string;
      sellerNetAmount: string;
      settlementState: string;
      createdAt: string;
    }>>(`${settlementBase()}/settlements`);
    const completed = (settlements || []).filter((s) => s.settlementState === "completed");

    const entries: JournalEntry[] = completed.map((s) => ({
      entryDate: s.createdAt,
      reference: s.id,
      description: `Settlement ${s.id} completed`,
      lines: [
        { accountId: "buyer_payment_clearing", direction: "debit", amount: Number(s.grossAmount) },
        { accountId: "platform_revenue", direction: "credit", amount: Number(s.platformFeeAmount) },
        { accountId: "seller_payable", direction: "credit", amount: Number(s.sellerNetAmount) },
        { accountId: "royalty_payable", direction: "credit", amount: Number(s.royaltyAmount) }
      ]
    }));

    // Flatten to CSV: one row per line.
    const flat: Array<Record<string, string | number>> = [];
    for (const e of entries) {
      for (const line of e.lines) {
        flat.push({
          entryDate: e.entryDate,
          reference: e.reference,
          accountId: line.accountId,
          direction: line.direction,
          amount: line.amount,
          description: e.description
        });
      }
    }

    const pkg: ExportPackage = {
      id: newId(),
      exportType: "journal_entries",
      format: "csv",
      scope,
      payloadJson: entries,
      csvBody: rowsToCsv(flat),
      createdAt: nowIso()
    };
    exports.push(pkg);
    return pkg;
  },

  /** Build a tax summary export from ledger payouts. */
  async buildTaxSummaries(scope: { from?: string; to?: string; periodYear?: string }): Promise<ExportPackage> {
    const periodYear = scope.periodYear || String(new Date().getUTCFullYear());
    const payouts = await fetchOk<Array<{
      payeeId: string;
      amount: string;
      referenceType: string;
      createdAt: string;
    }>>(`${ledgerBase()}/payouts`);
    const totals = new Map<string, TaxSummary>();
    for (const p of payouts || []) {
      const yr = p.createdAt.slice(0, 4);
      if (yr !== periodYear) continue;
      const existing = totals.get(p.payeeId) || {
        userId: p.payeeId,
        periodYear,
        totalEarnings: 0,
        totalPayouts: 0,
        withholdingsByJurisdiction: {}
      };
      existing.totalEarnings += Number(p.amount);
      existing.totalPayouts += Number(p.amount);
      totals.set(p.payeeId, existing);
    }
    const summaries = Array.from(totals.values());
    const csv = rowsToCsv(summaries.map((s) => ({
      userId: s.userId,
      periodYear: s.periodYear,
      totalEarnings: s.totalEarnings,
      totalPayouts: s.totalPayouts
    })));
    const pkg: ExportPackage = {
      id: newId(),
      exportType: "tax_summaries",
      format: "csv",
      scope,
      payloadJson: summaries,
      csvBody: csv,
      createdAt: nowIso()
    };
    exports.push(pkg);
    return pkg;
  },

  listExports: () => [...exports].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  findExport: (id: string) => exports.find((e) => e.id === id) || null
};
