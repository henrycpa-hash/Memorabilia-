/**
 * Wave 6 finance export primitives.
 *
 * Wave 5 settlement/ledger data gets shaped into invoices, royalty statements,
 * tax summaries, and journal-entry exports. Each export carries a stable
 * envelope so downstream ERPs/GLs can ingest CSV/JSON/XLSX consistently.
 */
export type InvoiceType =
  | "platform_fee"
  | "creator_payout"
  | "royalty_disbursement"
  | "campaign_billing"
  | "partner_settlement";

export type InvoiceStatus = "draft" | "issued" | "paid" | "void" | "credited";

export type ExportFormat = "json" | "csv" | "xlsx" | "qbo" | "iif";

export type JournalEntryLine = {
  accountId: string;
  direction: "debit" | "credit";
  amount: number;
  memo?: string;
};

export type JournalEntry = {
  entryDate: string;
  reference: string;
  description: string;
  lines: JournalEntryLine[];
};

export type RoyaltyStatementRow = {
  beneficiaryId: string;
  assetId: string;
  settlementId: string;
  grossAmount: number;
  royaltyPercent: number;
  payoutAmount: number;
  occurredAt: string;
};

export type TaxSummary = {
  userId: string;
  periodYear: string;
  totalEarnings: number;
  totalPayouts: number;
  withholdingsByJurisdiction: Record<string, number>;
};

/**
 * CSV serializer (Wave 6 stub — sufficient for ERP handoff sandbox).
 * Wave 7 plugs in real XLSX/QBO/IIF emitters.
 */
export function rowsToCsv<T extends Record<string, string | number>>(rows: T[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map((h) => escape(r[h])).join(","));
  }
  return lines.join("\n");
}
