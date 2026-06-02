import { LedgerAccounts } from "./accounts";
import type { PostingInput } from "./entries";

/**
 * Build the canonical 4-leg posting pack for a completed sale.
 *
 *   buyer_payment_clearing   credit  gross         "Buyer payment captured"
 *   platform_revenue         credit  fee           "Platform fee"
 *   seller_payable           credit  net           "Seller net payable"
 *   royalty_payable          credit  royalty       "Royalty payable"
 *
 * Amounts are formatted to two decimal places so the ledger stores
 * cents-clean values regardless of upstream rounding.
 */
export function buildOrderPosting(input: {
  orderId: string;
  gross: number;
  fee: number;
  royalty: number;
}): PostingInput[] {
  const net = input.gross - input.fee - input.royalty;
  const fmt = (n: number) => n.toFixed(2);
  const ref = { referenceType: "order", referenceId: input.orderId };
  return [
    {
      accountId: LedgerAccounts.BuyerPaymentClearing,
      direction: "credit",
      amount: fmt(input.gross),
      memo: "Buyer payment captured",
      ...ref
    },
    {
      accountId: LedgerAccounts.PlatformRevenue,
      direction: "credit",
      amount: fmt(input.fee),
      memo: "Platform fee",
      ...ref
    },
    {
      accountId: LedgerAccounts.SellerPayable,
      direction: "credit",
      amount: fmt(net),
      memo: "Seller net payable",
      ...ref
    },
    {
      accountId: LedgerAccounts.RoyaltyPayable,
      direction: "credit",
      amount: fmt(input.royalty),
      memo: "Royalty payable",
      ...ref
    }
  ];
}
